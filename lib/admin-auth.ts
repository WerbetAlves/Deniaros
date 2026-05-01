import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AdminRole = "founder" | "admin" | "support" | "billing";

type AdminUserRow = {
  is_active: boolean;
  role: AdminRole;
  user_id: string;
};

export type AdminAccessResult = {
  allowed: boolean;
  bootstrapHint?: string;
  role?: AdminRole;
};

export async function getAdminAccess(
  supabase: SupabaseClient,
  user: User
): Promise<AdminAccessResult> {
  const metadataRole = normalizeAdminRole(
    user.app_metadata?.saas_role ?? user.app_metadata?.role ?? user.user_metadata?.saas_role
  );
  const metadataAllowed =
    metadataRole !== null ||
    user.app_metadata?.is_saas_admin === true ||
    user.user_metadata?.is_saas_admin === true;

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id,role,is_active")
    .eq("user_id", user.id)
    .maybeSingle<AdminUserRow>();

  if (error) {
    return {
      allowed: metadataAllowed,
      bootstrapHint:
        "Execute a migration 0014_saas_admin_foundation.sql e cadastre seu usuário em admin_users."
    };
  }

  if (data?.is_active) {
    return {
      allowed: true,
      role: data.role
    };
  }

  return {
    allowed: metadataAllowed,
    bootstrapHint: metadataAllowed
      ? "Seu usuário tem metadata administrativa, mas ainda precisa ser registrado em admin_users para acessar todos os dados protegidos por RLS."
      : undefined,
    role: metadataRole ?? (metadataAllowed ? "admin" : undefined)
  };
}

export async function assertAdminAccess(supabase: SupabaseClient, user: User) {
  const access = await getAdminAccess(supabase, user);

  if (!access.allowed) {
    throw new Error("Acesso administrativo não autorizado.");
  }

  return access;
}

function normalizeAdminRole(value: unknown): AdminRole | null {
  if (value === "founder" || value === "admin" || value === "support" || value === "billing") {
    return value;
  }

  return null;
}
