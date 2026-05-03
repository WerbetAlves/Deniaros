"use server";

import { redirect } from "next/navigation";
import {
  recordDataAccessEvent,
  requestWorkspaceDeletion,
  upsertPrivacyPreferences,
  type PrivacyPreferences
} from "@/lib/privacy";
import { getWorkspaceContext } from "@/lib/workspace-context";

export async function updatePrivacyPreferences(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const dataRetentionMode = normalizeRetentionMode(formData.get("dataRetentionMode"));
  const policyAcknowledged = formData.get("policyAcknowledged") === "on";

  await upsertPrivacyPreferences(supabase, {
    allowAiFinancialContext: formData.get("allowAiFinancialContext") === "on",
    allowProductAnalytics: formData.get("allowProductAnalytics") === "on",
    dataRetentionMode,
    privacyPolicyAcknowledgedAt: policyAcknowledged ? new Date().toISOString() : null,
    userId: user.id,
    workspaceId
  });
  await recordDataAccessEvent(supabase, {
    accessReason: "Preferencias de privacidade atualizadas pelo usuario.",
    accessScope: "privacy_settings",
    metadata: {
      allowAiFinancialContext: formData.get("allowAiFinancialContext") === "on",
      allowProductAnalytics: formData.get("allowProductAnalytics") === "on",
      dataRetentionMode,
      policyAcknowledged
    },
    user,
    workspaceId
  });

  redirect("/settings/privacy?success=preferences");
}

export async function requestDataDeletion(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (confirmation !== "APAGAR DADOS DO SISTEMA") {
    redirect("/settings/privacy?error=confirmation");
  }

  await requestWorkspaceDeletion(supabase, user.id, workspaceId);
  await recordDataAccessEvent(supabase, {
    accessReason: "Pedido de exclusao dos dados do workspace aberto pelo usuario.",
    accessScope: "delete_request",
    metadata: {
      status: "requested"
    },
    user,
    workspaceId
  });

  redirect("/settings/privacy?success=deletion-requested");
}

export async function signOutOtherSessions() {
  const { supabase } = await getWorkspaceContext();
  const { error } = await supabase.auth.signOut({ scope: "others" });

  if (error) {
    redirect(`/settings/privacy?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/settings/privacy?success=other-sessions-signed-out");
}

export async function signOutEverywhere() {
  const { supabase } = await getWorkspaceContext();
  const { error } = await supabase.auth.signOut({ scope: "global" });

  if (error) {
    redirect(`/settings/privacy?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login");
}

function normalizeRetentionMode(value: FormDataEntryValue | null): PrivacyPreferences["dataRetentionMode"] {
  return value === "minimal" ? "minimal" : "standard";
}
