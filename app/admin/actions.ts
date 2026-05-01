"use server";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { assertAdminAccess, type AdminAccessResult, type AdminRole } from "@/lib/admin-auth";
import { requireAdminPermission } from "@/lib/admin-permissions";
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
    .select("id,workspace_id,requester_email,title,area,priority,status,assigned_admin_id")
    .eq("id", ticketId)
    .maybeSingle<Record<string, unknown>>();

  const { data: updatedTicket, error } = await supabase
    .from("saas_support_tickets")
    .update({
      status,
      priority,
      assigned_admin_id: user.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", ticketId)
    .select("id,workspace_id,requester_email,title,area,priority,status,assigned_admin_id")
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
    .select("id,workspace_id,status")
    .eq("id", ticketId)
    .maybeSingle<Record<string, unknown>>();

  const workspaceId = typeof ticket?.workspace_id === "string" ? ticket.workspace_id : null;

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

  if (visibility === "public" && ticket?.status === "open") {
    await supabase
      .from("saas_support_tickets")
      .update({
        assigned_admin_id: user.id,
        status: "waiting",
        updated_at: new Date().toISOString()
      })
      .eq("id", ticketId);
  } else {
    await supabase
      .from("saas_support_tickets")
      .update({
        assigned_admin_id: user.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", ticketId);
  }

  await recordAdminAudit(supabase, user, access, {
    action: "support_ticket_changed",
    afterState: {
      message_visibility: visibility,
      status_after_reply: visibility === "public" && ticket?.status === "open" ? "waiting" : ticket?.status
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

function normalizeTicketStatus(value: FormDataEntryValue | null) {
  const raw = String(value ?? "open");
  return ["open", "waiting", "resolved", "closed"].includes(raw) ? raw : "open";
}

function normalizeTicketPriority(value: FormDataEntryValue | null) {
  const raw = String(value ?? "medium");
  return ["low", "medium", "high", "urgent"].includes(raw) ? raw : "medium";
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
