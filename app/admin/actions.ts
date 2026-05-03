"use server";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { assertAdminAccess, type AdminAccessResult, type AdminRole } from "@/lib/admin-auth";
import { requireAdminPermission } from "@/lib/admin-permissions";
import type { TicketPriority, TicketStatus } from "@/lib/support";
import { buildSupportDueFields, createSupportNotification } from "@/lib/support-operations";
import { getWorkspaceContext } from "@/lib/workspace-context";

const adminPath = "/admin";

type AdminAuditPayload = {
  action:
    | "subscription_changed"
    | "feature_flag_changed"
    | "support_ticket_changed"
    | "admin_access_changed"
    | "workspace_reviewed";
  afterState?: Record<string, unknown> | null;
  beforeState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  targetId: string;
  targetType: "subscription" | "feature_flag" | "support_ticket" | "admin_user" | "workspace";
  workspaceId?: string | null;
};

export async function upsertSubscription(formData: FormData) {
  const { supabase, user } = await getWorkspaceContext();
  const access = await assertAdminAccess(supabase, user);
  const returnTo = normalizeAdminReturnTo(formData.get("returnTo"));
  const permissionError = getPermissionError(() =>
    requireAdminPermission(access.role, "manage_subscriptions")
  );

  if (permissionError) {
    redirect(`${returnTo}?error=${encodeURIComponent(permissionError)}`);
  }

  const workspaceId = String(formData.get("workspaceId") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();
  const planId = String(formData.get("planId") ?? "free").trim();
  const status = normalizeSubscriptionStatus(formData.get("status"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!workspaceId || !userId || !planId) {
    redirect(`${returnTo}?error=Assinatura incompleta para atualização.`);
  }

  const { data: previousSubscription } = await supabase
    .from("saas_subscriptions")
    .select("id,workspace_id,user_id,plan_id,status,seats,trial_ends_at,current_period_ends_at,notes")
    .eq("workspace_id", workspaceId)
    .maybeSingle<Record<string, unknown>>();

  const { data: updatedSubscription, error } = await supabase
    .from("saas_subscriptions")
    .upsert(
      {
        workspace_id: workspaceId,
        user_id: userId,
        plan_id: planId,
        status,
        notes,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "workspace_id"
      }
    )
    .select("id,workspace_id,user_id,plan_id,status,seats,trial_ends_at,current_period_ends_at,notes")
    .maybeSingle<Record<string, unknown>>();

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  await recordAdminAudit(supabase, user, access, {
    action: "subscription_changed",
    afterState: updatedSubscription ?? {
      workspace_id: workspaceId,
      user_id: userId,
      plan_id: planId,
      status,
      notes
    },
    beforeState: previousSubscription ?? null,
    metadata: {
      return_to: returnTo
    },
    targetId: String(updatedSubscription?.id ?? previousSubscription?.id ?? workspaceId),
    targetType: "subscription",
    workspaceId
  });

  redirect(`${returnTo}?success=Assinatura atualizada.`);
}

export async function updateFeatureFlag(formData: FormData) {
  const { supabase, user } = await getWorkspaceContext();
  const access = await assertAdminAccess(supabase, user);
  const returnTo = normalizeAdminReturnTo(formData.get("returnTo"));
  const permissionError = getPermissionError(() =>
    requireAdminPermission(access.role, "manage_feature_flags")
  );

  if (permissionError) {
    redirect(`${returnTo}?error=${encodeURIComponent(permissionError)}`);
  }

  const flagId = String(formData.get("flagId") ?? "").trim();

  if (!flagId) {
    redirect(`${returnTo}?error=Feature flag inválida.`);
  }

  const { data: previousFlag } = await supabase
    .from("feature_flags")
    .select("id,name,description,is_enabled,rollout_plan,allowed_plan_ids")
    .eq("id", flagId)
    .maybeSingle<Record<string, unknown>>();

  const { data: updatedFlag, error } = await supabase
    .from("feature_flags")
    .update({
      is_enabled: String(formData.get("isEnabled") ?? "") === "on",
      rollout_plan: String(formData.get("rolloutPlan") ?? "manual").trim() || "manual",
      updated_at: new Date().toISOString()
    })
    .eq("id", flagId)
    .select("id,name,description,is_enabled,rollout_plan,allowed_plan_ids")
    .maybeSingle<Record<string, unknown>>();

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  await recordAdminAudit(supabase, user, access, {
    action: "feature_flag_changed",
    afterState: updatedFlag ?? null,
    beforeState: previousFlag ?? null,
    metadata: {
      return_to: returnTo
    },
    targetId: flagId,
    targetType: "feature_flag",
    workspaceId: null
  });

  redirect(`${returnTo}?success=Feature flag atualizada.`);
}

export async function updateSupportTicket(formData: FormData) {
  const { supabase, user } = await getWorkspaceContext();
  const access = await assertAdminAccess(supabase, user);
  const returnTo = normalizeAdminReturnTo(formData.get("returnTo"));
  const permissionError = getPermissionError(() =>
    requireAdminPermission(access.role, "manage_support")
  );

  if (permissionError) {
    redirect(`${returnTo}?error=${encodeURIComponent(permissionError)}`);
  }

  const ticketId = String(formData.get("ticketId") ?? "").trim();
  const status = normalizeTicketStatus(formData.get("status"));
  const priority = normalizeTicketPriority(formData.get("priority"));

  if (!ticketId) {
    redirect(`${returnTo}?error=Ticket inválido.`);
  }

  const { data: previousTicket } = await supabase
    .from("saas_support_tickets")
    .select("id,workspace_id,requester_id,requester_email,title,area,priority,status,assigned_admin_id")
    .eq("id", ticketId)
    .maybeSingle<Record<string, unknown>>();

  const statusReason = String(formData.get("statusReason") ?? "").trim();
  const now = new Date().toISOString();
  const dueFields =
    status === "open" || status === "in_progress" ? buildSupportDueFields(now, priority) : {};

  const { data: updatedTicket, error } = await supabase
    .from("saas_support_tickets")
    .update({
      priority,
      assigned_admin_id: user.id,
      resolved_at: status === "resolved" ? now : null,
      status,
      status_reason: statusReason || getDefaultStatusReason(status),
      updated_at: now,
      ...dueFields
    })
    .eq("id", ticketId)
    .select("id,workspace_id,requester_id,requester_email,title,area,priority,status,assigned_admin_id,status_reason")
    .maybeSingle<Record<string, unknown>>();

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  const workspaceId =
    typeof updatedTicket?.workspace_id === "string"
      ? updatedTicket.workspace_id
      : typeof previousTicket?.workspace_id === "string"
        ? previousTicket.workspace_id
        : null;

  await recordAdminAudit(supabase, user, access, {
    action: "support_ticket_changed",
    afterState: updatedTicket ?? null,
    beforeState: previousTicket ?? null,
    metadata: {
      return_to: returnTo
    },
    targetId: ticketId,
    targetType: "support_ticket",
    workspaceId
  });

  const requesterId =
    typeof updatedTicket?.requester_id === "string"
      ? updatedTicket.requester_id
      : typeof previousTicket?.requester_id === "string"
        ? previousTicket.requester_id
        : null;

  await createSupportNotification(supabase, {
    body: `Status atualizado para ${translateStatusForNotification(status)}.${
      statusReason ? ` Motivo: ${statusReason}` : ""
    }`,
    kind: "status_changed",
    metadata: {
      priority,
      status
    },
    ticketId,
    title: "Ticket atualizado",
    userId: requesterId,
    workspaceId
  });

  redirect(`${returnTo}?success=Ticket atualizado.`);
}

export async function createSupportTicketMessage(formData: FormData) {
  const { supabase, user } = await getWorkspaceContext();
  const access = await assertAdminAccess(supabase, user);
  const returnTo = normalizeAdminReturnTo(formData.get("returnTo"));
  const permissionError = getPermissionError(() =>
    requireAdminPermission(access.role, "manage_support")
  );

  if (permissionError) {
    redirect(`${returnTo}?error=${encodeURIComponent(permissionError)}`);
  }

  const ticketId = String(formData.get("ticketId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const visibility = normalizeMessageVisibility(formData.get("visibility"));

  if (!ticketId) {
    redirect(`${returnTo}?error=Ticket inválido.`);
  }

  if (body.length < 2) {
    redirect(`${returnTo}?error=${encodeURIComponent("Escreva uma mensagem ou anotação.")}`);
  }

  const { data: ticket } = await supabase
    .from("saas_support_tickets")
    .select("id,workspace_id,requester_id,status,first_responded_at")
    .eq("id", ticketId)
    .maybeSingle<Record<string, unknown>>();

  const workspaceId = typeof ticket?.workspace_id === "string" ? ticket.workspace_id : null;
  const requesterId = typeof ticket?.requester_id === "string" ? ticket.requester_id : null;
  const now = new Date().toISOString();

  const { error } = await supabase.from("saas_support_ticket_messages").insert({
    author_id: user.id,
    author_role: "admin",
    body,
    ticket_id: ticketId,
    visibility,
    workspace_id: workspaceId
  });

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  if (visibility === "public" && ticket?.status !== "resolved" && ticket?.status !== "closed") {
    await supabase
      .from("saas_support_tickets")
      .update({
        assigned_admin_id: user.id,
        first_responded_at: ticket?.first_responded_at ?? now,
        status_reason: "Suporte respondeu e aguarda retorno do solicitante.",
        status: "waiting",
        updated_at: now
      })
      .eq("id", ticketId);
  } else {
    await supabase
      .from("saas_support_tickets")
      .update({
        assigned_admin_id: user.id,
        status_reason: visibility === "internal" ? "Nota interna registrada." : "Interacao administrativa registrada.",
        updated_at: now
      })
      .eq("id", ticketId);
  }

  if (visibility === "public") {
    await createSupportNotification(supabase, {
      body: "O suporte respondeu seu ticket. Revise o histórico e envie retorno se precisar.",
      kind: "admin_replied",
      metadata: {
        previousStatus: ticket?.status ?? null
      },
      ticketId,
      title: "Resposta do suporte",
      userId: requesterId,
      workspaceId
    });
  }

  await recordAdminAudit(supabase, user, access, {
    action: "support_ticket_changed",
    afterState: {
      message_visibility: visibility,
      status_after_reply:
        visibility === "public" && ticket?.status !== "resolved" && ticket?.status !== "closed"
          ? "waiting"
          : ticket?.status
    },
    beforeState: ticket ?? null,
    metadata: {
      message_created: true,
      return_to: returnTo
    },
    targetId: ticketId,
    targetType: "support_ticket",
    workspaceId
  });

  redirect(`${returnTo}?success=${visibility === "internal" ? "Anotação salva." : "Resposta registrada."}`);
}

export async function upsertAdminUser(formData: FormData) {
  const { supabase, user } = await getWorkspaceContext();
  const access = await assertAdminAccess(supabase, user);
  const returnTo = normalizeAdminReturnTo(formData.get("returnTo"), "/admin/permissions");
  const permissionError = getPermissionError(() =>
    requireAdminPermission(access.role, "manage_admins")
  );

  if (permissionError) {
    redirect(`${returnTo}?error=${encodeURIComponent(permissionError)}`);
  }

  const targetUserId = String(formData.get("userId") ?? "").trim();
  const role = normalizeAdminRole(formData.get("role"));
  const isActive = String(formData.get("isActive") ?? "on") === "on";

  if (!targetUserId) {
    redirect(`${returnTo}?error=${encodeURIComponent("Informe o ID do usuário administrativo.")}`);
  }

  if (targetUserId === user.id && role !== "founder") {
    redirect(`${returnTo}?error=${encodeURIComponent("Você não pode remover seu próprio papel de founder.")}`);
  }

  if (targetUserId === user.id && !isActive) {
    redirect(`${returnTo}?error=${encodeURIComponent("Você não pode desativar o próprio acesso administrativo.")}`);
  }

  const { data: previousAdmin } = await supabase
    .from("admin_users")
    .select("user_id,role,is_active,created_by,created_at")
    .eq("user_id", targetUserId)
    .maybeSingle<Record<string, unknown>>();

  const { data: updatedAdmin, error } = await supabase
    .from("admin_users")
    .upsert(
      {
        created_by: previousAdmin?.created_by ?? user.id,
        is_active: isActive,
        role,
        user_id: targetUserId
      },
      {
        onConflict: "user_id"
      }
    )
    .select("user_id,role,is_active,created_by,created_at")
    .maybeSingle<Record<string, unknown>>();

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  await recordAdminAudit(supabase, user, access, {
    action: "admin_access_changed",
    afterState: updatedAdmin ?? {
      is_active: isActive,
      role,
      user_id: targetUserId
    },
    beforeState: previousAdmin ?? null,
    metadata: {
      return_to: returnTo
    },
    targetId: targetUserId,
    targetType: "admin_user",
    workspaceId: null
  });

  redirect(`${returnTo}?success=${encodeURIComponent("Permissão administrativa atualizada.")}`);
}

async function recordAdminAudit(
  supabase: SupabaseClient,
  user: User,
  access: AdminAccessResult,
  payload: AdminAuditPayload
) {
  await supabase.from("admin_audit_events").insert({
    action: payload.action,
    actor_id: user.id,
    actor_role: access.role ?? "admin",
    after_state: payload.afterState ?? null,
    before_state: payload.beforeState ?? null,
    metadata: payload.metadata ?? {},
    target_id: payload.targetId,
    target_type: payload.targetType,
    workspace_id: payload.workspaceId ?? null
  });
}

function normalizeSubscriptionStatus(value: FormDataEntryValue | null) {
  const raw = String(value ?? "trialing");
  return ["trialing", "active", "past_due", "canceled", "suspended", "manual"].includes(raw)
    ? raw
    : "trialing";
}

function normalizeTicketStatus(value: FormDataEntryValue | null): TicketStatus {
  const raw = String(value ?? "open");
  if (raw === "in_progress" || raw === "waiting" || raw === "resolved" || raw === "closed") {
    return raw;
  }
  return "open";
}

function normalizeTicketPriority(value: FormDataEntryValue | null): TicketPriority {
  const raw = String(value ?? "medium");
  if (raw === "low" || raw === "high" || raw === "urgent") {
    return raw;
  }
  return "medium";
}

function normalizeMessageVisibility(value: FormDataEntryValue | null) {
  const raw = String(value ?? "public");
  return raw === "internal" ? "internal" : "public";
}

function normalizeAdminReturnTo(value: FormDataEntryValue | null, fallback = adminPath) {
  const raw = String(value ?? "").trim();
  return raw.startsWith("/admin") ? raw : fallback;
}

function normalizeAdminRole(value: FormDataEntryValue | null): AdminRole {
  const raw = String(value ?? "support");
  return raw === "founder" || raw === "admin" || raw === "support" || raw === "billing"
    ? raw
    : "support";
}

function getPermissionError(check: () => void) {
  try {
    check();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Ação administrativa não autorizada.";
  }
}

function getDefaultStatusReason(status: string) {
  const reasons: Record<string, string> = {
    closed: "Atendimento fechado pela administracao.",
    in_progress: "Ticket assumido para análise do suporte.",
    open: "Ticket mantido na fila de suporte.",
    resolved: "Ticket marcado como resolvido.",
    waiting: "Suporte aguarda retorno do solicitante."
  };

  return reasons[status] ?? "Status atualizado pelo suporte.";
}

function translateStatusForNotification(status: string) {
  const labels: Record<string, string> = {
    closed: "fechado",
    in_progress: "em análise",
    open: "aberto",
    resolved: "resolvido",
    waiting: "aguardando você"
  };

  return labels[status] ?? status;
}
