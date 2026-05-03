import type { SupabaseClient, User } from "@supabase/supabase-js";

export type PrivacyPreferences = {
  allowAiFinancialContext: boolean;
  allowProductAnalytics: boolean;
  dataRetentionMode: "standard" | "minimal";
  deleteRequestedAt: string | null;
  deleteRequestStatus: "none" | "requested" | "processing" | "completed" | "cancelled";
  privacyPolicyAcknowledgedAt: string | null;
  updatedAt: string | null;
};

export type DataAccessScope =
  | "privacy_settings"
  | "financial_context_ai"
  | "backup_export"
  | "backup_restore"
  | "delete_request"
  | "support_review"
  | "admin_financial_review"
  | "admin_operational_review";

type PrivacyPreferencesRow = {
  allow_ai_financial_context: boolean;
  allow_product_analytics: boolean;
  data_retention_mode: "standard" | "minimal";
  delete_requested_at: string | null;
  delete_request_status: "none" | "requested" | "processing" | "completed" | "cancelled";
  privacy_policy_acknowledged_at: string | null;
  updated_at: string | null;
};

export const defaultPrivacyPreferences: PrivacyPreferences = {
  allowAiFinancialContext: false,
  allowProductAnalytics: false,
  dataRetentionMode: "standard",
  deleteRequestedAt: null,
  deleteRequestStatus: "none",
  privacyPolicyAcknowledgedAt: null,
  updatedAt: null
};

export async function getPrivacyPreferences(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<PrivacyPreferences> {
  const { data, error } = await supabase
    .from("privacy_preferences")
    .select(
      "allow_ai_financial_context,allow_product_analytics,data_retention_mode,privacy_policy_acknowledged_at,delete_requested_at,delete_request_status,updated_at"
    )
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle<PrivacyPreferencesRow>();

  if (error) {
    if (error.code === "42P01" || error.code === "42703") {
      return defaultPrivacyPreferences;
    }

    throw error;
  }

  if (!data) {
    return defaultPrivacyPreferences;
  }

  return mapPrivacyPreferences(data);
}

export async function upsertPrivacyPreferences(
  supabase: SupabaseClient,
  {
    allowAiFinancialContext,
    allowProductAnalytics,
    dataRetentionMode,
    privacyPolicyAcknowledgedAt,
    userId,
    workspaceId
  }: {
    allowAiFinancialContext: boolean;
    allowProductAnalytics: boolean;
    dataRetentionMode: PrivacyPreferences["dataRetentionMode"];
    privacyPolicyAcknowledgedAt: string | null;
    userId: string;
    workspaceId: string;
  }
) {
  const { error } = await supabase.from("privacy_preferences").upsert(
    {
      allow_ai_financial_context: allowAiFinancialContext,
      allow_product_analytics: allowProductAnalytics,
      data_retention_mode: dataRetentionMode,
      privacy_policy_acknowledged_at: privacyPolicyAcknowledgedAt,
      updated_at: new Date().toISOString(),
      user_id: userId,
      workspace_id: workspaceId
    },
    { onConflict: "user_id,workspace_id" }
  );

  if (error) {
    throw error;
  }
}

export async function requestWorkspaceDeletion(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
) {
  const { error } = await supabase.from("privacy_preferences").upsert(
    {
      delete_request_status: "requested",
      delete_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: userId,
      workspace_id: workspaceId
    },
    { onConflict: "user_id,workspace_id" }
  );

  if (error) {
    throw error;
  }
}

export async function recordDataAccessEvent(
  supabase: SupabaseClient,
  {
    accessReason,
    accessScope,
    actorRole = "owner",
    metadata = {},
    user,
    workspaceId
  }: {
    accessReason: string;
    accessScope: DataAccessScope;
    actorRole?: "owner" | "member" | "admin" | "founder" | "support" | "billing" | "system";
    metadata?: Record<string, unknown>;
    user: User;
    workspaceId: string;
  }
) {
  const { error } = await supabase.from("data_access_events").insert({
    access_reason: accessReason,
    access_scope: accessScope,
    actor_id: user.id,
    actor_role: actorRole,
    metadata,
    workspace_id: workspaceId
  });

  if (error && error.code !== "42P01" && error.code !== "42703") {
    throw error;
  }
}

function mapPrivacyPreferences(row: PrivacyPreferencesRow): PrivacyPreferences {
  return {
    allowAiFinancialContext: row.allow_ai_financial_context,
    allowProductAnalytics: row.allow_product_analytics,
    dataRetentionMode: row.data_retention_mode,
    deleteRequestedAt: row.delete_requested_at,
    deleteRequestStatus: row.delete_request_status,
    privacyPolicyAcknowledgedAt: row.privacy_policy_acknowledged_at,
    updatedAt: row.updated_at
  };
}
