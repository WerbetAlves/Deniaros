import type { Account, Category, Payee, ScheduledItem, Transaction } from "@/lib/domain";

export const accountTypeOptions = [
  { id: "checking", label: "Conta corrente" },
  { id: "cash", label: "Carteira" },
  { id: "credit", label: "Cartão" },
  { id: "business", label: "Negócio" },
  { id: "savings", label: "Reserva" },
  { id: "asset", label: "Ativo" },
  { id: "liability", label: "Passivo" },
  { id: "loan", label: "Empréstimo" },
  { id: "investment", label: "Investimento" },
  { id: "retirement", label: "Aposentadoria" }
] as const;

export const accountGroupOptions = [
  { id: "daily_spending", label: "Despesas diárias" },
  { id: "short_term_savings", label: "Poupança de curto prazo" },
  { id: "long_term_savings", label: "Investimentos e longo prazo" },
  { id: "retirement", label: "Aposentadoria" },
  { id: "debt", label: "Dívidas e passivos" },
  { id: "excluded", label: "Fora do orçamento" }
] as const;

export const accountColorOptions = [
  { id: "emerald", label: "Verde clássico" },
  { id: "blue", label: "Azul assinatura" },
  { id: "gold", label: "Dourado" },
  { id: "violet", label: "Violeta" }
] as const;

export const accountConnectionModeOptions = [
  { id: "manual", label: "Manual (sem conexão bancária)" },
  { id: "openfinance", label: "Conectar com Open Finance" }
] as const;

export const openFinanceStatusOptions = [
  { id: "not_connected", label: "Não conectado" },
  { id: "pending", label: "Conexão pendente" },
  { id: "connected", label: "Conectado" },
  { id: "error", label: "Falha na conexão" }
] as const;

export const categoryKindOptions = [
  { id: "expense", label: "Despesa" },
  { id: "income", label: "Receita" }
] as const;

export const scheduleKindOptions = [
  { id: "bill", label: "Conta a pagar" },
  { id: "deposit", label: "Depósito" },
  { id: "saving", label: "Reserva" }
] as const;

export const scheduleRecurrenceOptions = [
  { id: "once", label: "Uma vez" },
  { id: "weekly", label: "Semanal" },
  { id: "monthly", label: "Mensal" }
] as const;

export const scheduleStatusOptions = [
  { id: "scheduled", label: "Programado" },
  { id: "due-soon", label: "Vence logo" },
  { id: "overdue", label: "Em atraso" },
  { id: "paid", label: "Pago" }
] as const;

export const payeeTypeOptions = [
  { id: "person", label: "Pessoa" },
  { id: "company", label: "Empresa" },
  { id: "place", label: "Lugar" }
] as const;

export const accountTypeLabels: Record<Account["type"], string> = Object.fromEntries(
  accountTypeOptions.map((option) => [option.id, option.label])
) as Record<Account["type"], string>;

export const categoryKindLabels: Record<Category["kind"], string> = Object.fromEntries(
  categoryKindOptions.map((option) => [option.id, option.label])
) as Record<Category["kind"], string>;

export const scheduleKindLabels: Record<ScheduledItem["kind"], string> = Object.fromEntries(
  scheduleKindOptions.map((option) => [option.id, option.label])
) as Record<ScheduledItem["kind"], string>;

export const scheduleStatusLabels: Record<ScheduledItem["status"], string> = Object.fromEntries(
  scheduleStatusOptions.map((option) => [option.id, option.label])
) as Record<ScheduledItem["status"], string>;

export const payeeTypeLabels: Record<Payee["type"], string> = Object.fromEntries(
  payeeTypeOptions.map((option) => [option.id, option.label])
) as Record<Payee["type"], string>;

export type WorkspaceAccount = Account & {
  workspaceId: string;
  openingBalanceDate?: string;
  isActive: boolean;
  accountGroup: AccountGroup;
  connectionMode: AccountConnectionMode;
  openFinanceProvider?: string;
  openFinanceStatus: OpenFinanceStatus;
  externalAccountRef?: string;
  isFavorite: boolean;
};

export type WorkspaceCategory = Category & {
  workspaceId: string;
};

export type WorkspaceScheduledItem = ScheduledItem & {
  workspaceId: string;
};

export type WorkspacePayee = Payee & {
  workspaceId: string;
  notes: string;
};

export type WorkspaceTransaction = Transaction & {
  workspaceId: string;
};

export type WorkspaceAccountRow = {
  id: string;
  workspace_id: string;
  name: string;
  type: Account["type"] | null;
  opening_balance: number | string | null;
  opening_balance_date?: string | null;
  currency: string | null;
  color: string | null;
  is_active: boolean | null;
  account_group?: string | null;
  connection_mode?: string | null;
  openfinance_provider?: string | null;
  openfinance_status?: string | null;
  external_account_ref?: string | null;
  is_favorite?: boolean | null;
};

export type WorkspaceCategoryRow = {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  name: string;
  kind: Category["kind"] | null;
};

export type WorkspaceScheduledItemRow = {
  id: string;
  workspace_id: string;
  kind: ScheduledItem["kind"] | null;
  account_id: string;
  category_id: string | null;
  payee_id: string | null;
  title: string;
  amount: number | string | null;
  currency: string | null;
  due_on: string;
  recurrence: ScheduledItem["recurrence"] | null;
  status: "scheduled" | "due_soon" | "overdue" | "paid" | null;
};

export type WorkspacePayeeRow = {
  id: string;
  workspace_id: string;
  name: string;
  type: Payee["type"] | null;
  notes: string | null;
};

export type WorkspaceTransactionRow = {
  id: string;
  workspace_id: string;
  account_id: string;
  transfer_account_id: string | null;
  category_id: string | null;
  payee_id: string | null;
  description: string;
  amount: number | string | null;
  currency: string | null;
  occurred_on: string;
  scheduled_item_id?: string | null;
  scheduled_occurrence_date?: string | null;
  reconciled_at?: string | null;
  reconciled_by?: string | null;
  status: Transaction["status"] | null;
  source: Transaction["source"] | null;
};

export function mapWorkspaceAccount(row: WorkspaceAccountRow): WorkspaceAccount {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    type: normalizeAccountType(row.type),
    openingBalance: Number(row.opening_balance ?? 0),
    openingBalanceDate: row.opening_balance_date ?? undefined,
    currency: normalizeCurrency(row.currency, "BRL"),
    color: normalizeAccountColor(row.color),
    isActive: row.is_active ?? true,
    accountGroup: normalizeAccountGroup(row.account_group, row.type),
    connectionMode: normalizeAccountConnectionMode(row.connection_mode),
    openFinanceProvider: row.openfinance_provider ?? undefined,
    openFinanceStatus: normalizeOpenFinanceStatus(row.openfinance_status),
    externalAccountRef: row.external_account_ref ?? undefined,
    isFavorite: row.is_favorite ?? false
  };
}

export function mapWorkspaceCategory(row: WorkspaceCategoryRow): WorkspaceCategory {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    kind: normalizeCategoryKind(row.kind),
    parentId: row.parent_id ?? undefined
  };
}

export function mapWorkspaceScheduledItem(
  row: WorkspaceScheduledItemRow
): WorkspaceScheduledItem {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    kind: normalizeScheduleKind(row.kind),
    accountId: row.account_id,
    categoryId: row.category_id ?? undefined,
    payeeId: row.payee_id ?? undefined,
    title: row.title,
    amount: Number(row.amount ?? 0),
    currency: normalizeCurrency(row.currency, "BRL"),
    dueDate: row.due_on,
    recurrence: normalizeScheduleRecurrence(row.recurrence),
    status: normalizeScheduleStatus(row.status === "due_soon" ? "due-soon" : row.status)
  };
}

export function mapWorkspacePayee(row: WorkspacePayeeRow): WorkspacePayee {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    type: normalizePayeeType(row.type),
    notes: row.notes ?? ""
  };
}

export function mapWorkspaceTransaction(
  row: WorkspaceTransactionRow
): WorkspaceTransaction {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    accountId: row.account_id,
    transferAccountId: row.transfer_account_id ?? undefined,
    categoryId: row.category_id ?? undefined,
    payeeId: row.payee_id ?? undefined,
    description: row.description,
    amount: Number(row.amount ?? 0),
    currency: normalizeCurrency(row.currency, "BRL"),
    date: row.occurred_on,
    status: row.status ?? "posted",
    source: row.source ?? "manual",
    scheduledItemId: row.scheduled_item_id ?? undefined,
    scheduledOccurrenceDate: row.scheduled_occurrence_date ?? undefined,
    reconciledAt: row.reconciled_at ?? undefined,
    reconciledBy: row.reconciled_by ?? undefined
  };
}

export function normalizeAccountType(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return accountTypeOptions.some((option) => option.id === raw)
    ? (raw as Account["type"])
    : "checking";
}

export function normalizeAccountColor(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return accountColorOptions.some((option) => option.id === raw)
    ? (raw as (typeof accountColorOptions)[number]["id"])
    : "emerald";
}

export type AccountConnectionMode = (typeof accountConnectionModeOptions)[number]["id"];
export type AccountGroup = (typeof accountGroupOptions)[number]["id"];
export type OpenFinanceStatus = (typeof openFinanceStatusOptions)[number]["id"];

export const accountGroupLabels: Record<AccountGroup, string> = Object.fromEntries(
  accountGroupOptions.map((option) => [option.id, option.label])
) as Record<AccountGroup, string>;

export const openFinanceStatusLabels: Record<OpenFinanceStatus, string> = Object.fromEntries(
  openFinanceStatusOptions.map((option) => [option.id, option.label])
) as Record<OpenFinanceStatus, string>;

export function normalizeAccountGroup(
  value: FormDataEntryValue | string | null | undefined,
  fallbackType?: FormDataEntryValue | string | null
) {
  const raw = String(value ?? "");
  if (accountGroupOptions.some((option) => option.id === raw)) {
    return raw as AccountGroup;
  }

  const accountType = normalizeAccountType(fallbackType ?? null);

  if (accountType === "savings") {
    return "short_term_savings";
  }

  if (accountType === "investment" || accountType === "asset") {
    return "long_term_savings";
  }

  if (accountType === "retirement") {
    return "retirement";
  }

  if (accountType === "credit" || accountType === "liability" || accountType === "loan") {
    return "debt";
  }

  return "daily_spending";
}

export function normalizeAccountConnectionMode(
  value: FormDataEntryValue | string | null | undefined
) {
  const raw = String(value ?? "");
  return accountConnectionModeOptions.some((option) => option.id === raw)
    ? (raw as AccountConnectionMode)
    : "manual";
}

export function normalizeOpenFinanceStatus(
  value: FormDataEntryValue | string | null | undefined
) {
  const raw = String(value ?? "");
  return openFinanceStatusOptions.some((option) => option.id === raw)
    ? (raw as OpenFinanceStatus)
    : "not_connected";
}

export function normalizeCategoryKind(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return categoryKindOptions.some((option) => option.id === raw)
    ? (raw as Category["kind"])
    : "expense";
}

export function normalizeScheduleKind(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return scheduleKindOptions.some((option) => option.id === raw)
    ? (raw as ScheduledItem["kind"])
    : "bill";
}

export function normalizeScheduleRecurrence(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return scheduleRecurrenceOptions.some((option) => option.id === raw)
    ? (raw as ScheduledItem["recurrence"])
    : "once";
}

export function normalizeScheduleStatus(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return scheduleStatusOptions.some((option) => option.id === raw)
    ? (raw as ScheduledItem["status"])
    : "scheduled";
}

export function normalizePayeeType(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return payeeTypeOptions.some((option) => option.id === raw)
    ? (raw as Payee["type"])
    : "company";
}

export function toScheduleStatusDb(status: ScheduledItem["status"]) {
  return status === "due-soon" ? "due_soon" : status;
}

export function normalizeCurrency(
  value: FormDataEntryValue | string | null,
  fallback: string
) {
  const raw = String(value ?? fallback).trim().toUpperCase();
  return /^[A-Z]{3}$/.test(raw) ? raw : fallback;
}

export function normalizeScheduledAmount(
  kind: ScheduledItem["kind"],
  value: FormDataEntryValue | string | null
) {
  const number = Math.abs(Number(value ?? 0));
  if (!Number.isFinite(number)) {
    return 0;
  }

  return kind === "deposit" ? number : -number;
}

