export const workspaceScopedBackupTables = [
  "accounts",
  "categories",
  "payees",
  "transactions",
  "scheduled_items",
  "exchange_rates",
  "personal_profiles",
  "home_inventory_items",
  "tax_categories",
  "financial_goals",
  "category_budgets",
  "import_rules",
  "debt_reduction_debts",
  "import_batches",
  "transaction_audit_events",
  "account_reconciliation_checks",
  "saas_support_tickets",
  "saas_support_ticket_messages",
  "saas_subscriptions",
  "system_preferences",
  "privacy_preferences",
  "data_access_events"
] as const;

export type WorkspaceScopedBackupTable = (typeof workspaceScopedBackupTables)[number];

export function validateBackupPayload(payload: unknown, currentUserId: string) {
  if (!isRecord(payload)) {
    return "Arquivo de backup invalido.";
  }

  if (payload.app !== "Deniaros") {
    return "Este arquivo nao e um backup Deniaros.";
  }

  if (payload.exportVersion !== 1) {
    return "Versao de backup nao suportada.";
  }

  if (!isRecord(payload.user) || payload.user.id !== currentUserId) {
    return "Este backup pertence a outro usuario.";
  }

  if (!isRecord(payload.workspace)) {
    return "O backup nao contem dados de workspace.";
  }

  if (!isRecord(payload.tables)) {
    return "O backup nao contem tabelas restauraveis.";
  }

  return null;
}

export function buildWorkspaceBackupFileName(workspaceName: unknown, exportedAtIso: string) {
  const fileDate = exportedAtIso.slice(0, 10);
  const safeWorkspaceName = sanitizeBackupSlug(String(workspaceName ?? "workspace"));

  return `deniaros-${safeWorkspaceName || "workspace"}-${fileDate}.json`;
}

export function sanitizeBackupSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
