"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceContext } from "@/lib/workspace-context";

const familyPath = "/settings/family";

type FamilyRole = "partner" | "contributor" | "viewer";

type SubscriptionSeatRow = {
  plan_id: string;
  seats: number;
  status: string;
};

type WorkspaceRow = {
  owner_id: string;
};

type InvitationRow = {
  expires_at: string;
  id: string;
  invited_by: string;
  invited_email: string;
  permissions: Record<string, unknown>;
  role: FamilyRole;
  status: string;
  token: string;
  workspace_id: string;
};

export async function createFamilyInvitation(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const email = normalizeEmail(formData.get("email"));
  const role = normalizeFamilyRole(formData.get("role"));

  if (!email) {
    redirect(`${familyPath}?error=${encodeURIComponent("Informe o e-mail do membro familiar.")}`);
  }

  if (email === normalizeEmail(user.email)) {
    redirect(`${familyPath}?error=${encodeURIComponent("Convide um e-mail diferente do titular.")}`);
  }

  const canInvite = await canInviteMoreMembers(supabase, workspaceId);

  if (!canInvite.allowed) {
    redirect(`${familyPath}?error=${encodeURIComponent(canInvite.reason)}`);
  }

  const token = crypto.randomUUID();
  const { error } = await supabase.from("workspace_invitations").insert({
    invited_by: user.id,
    invited_email: email,
    permissions: getRolePermissions(role),
    role,
    token,
    workspace_id: workspaceId
  });

  if (error) {
    redirect(`${familyPath}?error=${encodeURIComponent(error.message)}`);
  }

  await Promise.all([
    supabase.from("workspaces").update({ type: "family", updated_at: new Date().toISOString() }).eq("id", workspaceId),
    supabase.from("data_access_events").insert({
      access_reason: `Convite familiar enviado para ${email}.`,
      access_scope: "family_invite",
      actor_id: user.id,
      actor_role: "owner",
      metadata: { invitedEmail: email, role },
      workspace_id: workspaceId
    })
  ]);

  redirect(`${familyPath}?success=${encodeURIComponent("Convite familiar criado.")}&invite=${token}`);
}

export async function cancelFamilyInvitation(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const invitationId = String(formData.get("invitationId") ?? "");
  const { error } = await supabase
    .from("workspace_invitations")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(`${familyPath}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`${familyPath}?success=${encodeURIComponent("Convite cancelado.")}`);
}

export async function removeFamilyMember(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const memberId = String(formData.get("memberId") ?? "");
  const { error } = await supabase
    .from("workspace_members")
    .update({ is_primary: false, status: "removed", updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(`${familyPath}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`${familyPath}?success=${encodeURIComponent("Membro removido do workspace familiar.")}`);
}

export async function updateFamilyMemberRole(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const memberId = String(formData.get("memberId") ?? "");
  const role = normalizeFamilyRole(formData.get("role"));
  const { error } = await supabase
    .from("workspace_members")
    .update({
      permissions: getRolePermissions(role),
      role,
      updated_at: new Date().toISOString()
    })
    .eq("id", memberId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(`${familyPath}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`${familyPath}?success=${encodeURIComponent("Permissoes familiares atualizadas.")}`);
}

export async function acceptFamilyInvitation(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?error=${encodeURIComponent("Entre com o e-mail convidado para aceitar o convite.")}`);
  }

  const admin = createSupabaseAdminClient();
  const { data: invitation, error } = await admin
    .from("workspace_invitations")
    .select("id,workspace_id,invited_email,invited_by,role,permissions,token,status,expires_at")
    .eq("token", token)
    .maybeSingle<InvitationRow>();

  if (error || !invitation) {
    redirect(`/family/accept?token=${encodeURIComponent(token)}&error=${encodeURIComponent("Convite nao encontrado.")}`);
  }

  if (invitation.status !== "pending") {
    redirect(`/family/accept?token=${encodeURIComponent(token)}&error=${encodeURIComponent("Este convite ja foi usado ou cancelado.")}`);
  }

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    await admin.from("workspace_invitations").update({ status: "expired" }).eq("id", invitation.id);
    redirect(`/family/accept?token=${encodeURIComponent(token)}&error=${encodeURIComponent("Este convite expirou.")}`);
  }

  if (normalizeEmail(invitation.invited_email) !== normalizeEmail(user.email)) {
    redirect(
      `/family/accept?token=${encodeURIComponent(token)}&error=${encodeURIComponent(
        "Este convite pertence a outro e-mail. Entre com a conta convidada."
      )}`
    );
  }

  const canInvite = await canInviteMoreMembers(admin, invitation.workspace_id);

  if (!canInvite.allowed) {
    redirect(`/family/accept?token=${encodeURIComponent(token)}&error=${encodeURIComponent(canInvite.reason)}`);
  }

  await admin
    .from("workspace_members")
    .update({ is_primary: false, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  const { error: memberError } = await admin.from("workspace_members").upsert(
    {
      accepted_at: new Date().toISOString(),
      display_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      email: normalizeEmail(user.email),
      invited_by: invitation.invited_by,
      is_primary: true,
      permissions: invitation.permissions,
      role: invitation.role,
      status: "active",
      updated_at: new Date().toISOString(),
      user_id: user.id,
      workspace_id: invitation.workspace_id
    },
    { onConflict: "workspace_id,user_id" }
  );

  if (memberError) {
    redirect(`/family/accept?token=${encodeURIComponent(token)}&error=${encodeURIComponent(memberError.message)}`);
  }

  await Promise.all([
    admin
      .from("workspace_invitations")
      .update({ accepted_at: new Date().toISOString(), status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", invitation.id),
    admin.from("workspaces").update({ type: "family", updated_at: new Date().toISOString() }).eq("id", invitation.workspace_id),
    admin.from("data_access_events").insert({
      access_reason: "Convite familiar aceito.",
      access_scope: "family_member_access",
      actor_id: user.id,
      actor_role: "member",
      metadata: { role: invitation.role },
      workspace_id: invitation.workspace_id
    })
  ]);

  redirect(`${familyPath}?success=${encodeURIComponent("Convite aceito. Voce agora esta no workspace familiar.")}`);
}

async function canInviteMoreMembers(
  supabase: Awaited<ReturnType<typeof getWorkspaceContext>>["supabase"],
  workspaceId: string
) {
  const [subscriptionResult, membersResult, pendingInvitesResult] = await Promise.all([
    supabase
      .from("saas_subscriptions")
      .select("plan_id,status,seats")
      .eq("workspace_id", workspaceId)
      .maybeSingle<SubscriptionSeatRow>(),
    supabase
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "active"),
    supabase
      .from("workspace_invitations")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
  ]);
  const seats = subscriptionResult.data?.seats ?? 1;
  const activeMembers = membersResult.count ?? 0;
  const pendingInvites = pendingInvitesResult.count ?? 0;
  const usedSeats = 1 + activeMembers + pendingInvites;

  if (subscriptionResult.error) {
    return {
      allowed: false,
      reason: "Nao foi possivel validar os assentos da assinatura."
    };
  }

  if (seats < 2) {
    return {
      allowed: false,
      reason: "Ative o Plano Familia ou um plano com assento adicional antes de convidar."
    };
  }

  if (usedSeats >= seats) {
    return {
      allowed: false,
      reason: "Todos os assentos familiares ja estao ocupados ou reservados por convites pendentes."
    };
  }

  return {
    allowed: true,
    reason: ""
  };
}

function normalizeEmail(value: FormDataEntryValue | string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeFamilyRole(value: FormDataEntryValue | null): FamilyRole {
  return value === "viewer" || value === "contributor" ? value : "partner";
}

function getRolePermissions(role: FamilyRole) {
  if (role === "viewer") {
    return {
      can_manage_finance: false,
      can_manage_invites: false,
      can_manage_open_finance: false,
      can_view_consolidated: true
    };
  }

  if (role === "contributor") {
    return {
      can_manage_finance: true,
      can_manage_invites: false,
      can_manage_open_finance: false,
      can_view_consolidated: true
    };
  }

  return {
    can_manage_finance: true,
    can_manage_invites: false,
    can_manage_open_finance: true,
    can_view_consolidated: true
  };
}
