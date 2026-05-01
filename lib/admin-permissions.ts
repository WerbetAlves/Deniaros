import type { AdminRole } from "@/lib/admin-auth";

export type AdminPermission =
  | "manage_admins"
  | "manage_feature_flags"
  | "manage_subscriptions"
  | "manage_support"
  | "read_admin";

const rolePermissions: Record<AdminRole, AdminPermission[]> = {
  admin: ["read_admin", "manage_feature_flags", "manage_subscriptions", "manage_support"],
  billing: ["read_admin", "manage_subscriptions"],
  founder: [
    "read_admin",
    "manage_admins",
    "manage_feature_flags",
    "manage_subscriptions",
    "manage_support"
  ],
  support: ["read_admin", "manage_support"]
};

export function getAdminRoleLabel(role?: AdminRole) {
  const labels: Record<AdminRole, string> = {
    admin: "Admin",
    billing: "Financeiro",
    founder: "Founder",
    support: "Suporte"
  };
  return role ? labels[role] : "Admin";
}

export function hasAdminPermission(role: AdminRole | undefined, permission: AdminPermission) {
  const effectiveRole = role ?? "admin";
  return rolePermissions[effectiveRole].includes(permission);
}

export function requireAdminPermission(
  role: AdminRole | undefined,
  permission: AdminPermission,
  message = "Seu papel administrativo não permite esta ação."
) {
  if (!hasAdminPermission(role, permission)) {
    throw new Error(message);
  }
}
