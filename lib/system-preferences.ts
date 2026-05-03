import type { SupabaseClient } from "@supabase/supabase-js";

export const languageOptions = [
  { id: "pt-BR", label: "Portugues do Brasil", locale: "pt-BR" },
  { id: "en-US", label: "English", locale: "en-US" },
  { id: "es-ES", label: "Espanol", locale: "es-ES" }
] as const;

export const currencyOptions = [
  { id: "BRL", label: "Real brasileiro" },
  { id: "USD", label: "Dolar americano" },
  { id: "EUR", label: "Euro" },
  { id: "GBP", label: "Libra esterlina" }
] as const;

export const dateFormatOptions = [
  { id: "dd/MM/yyyy", label: "31/12/2026" },
  { id: "MM/dd/yyyy", label: "12/31/2026" },
  { id: "yyyy-MM-dd", label: "2026-12-31" }
] as const;

export const quickAddOptions = [
  { id: "transaction", label: "Novo movimento" },
  { id: "bill", label: "Nova conta a pagar" },
  { id: "deposit", label: "Novo deposito" },
  { id: "account", label: "Nova carteira" }
] as const;

export type SystemPreferences = {
  autoCategorizeImports: boolean;
  budgetRiskAlertsEnabled: boolean;
  commandPaletteEnabled: boolean;
  compactNumbers: boolean;
  dateFormat: DateFormatId;
  dueBillAlertsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  enterToSubmit: boolean;
  inAppNotificationsEnabled: boolean;
  keyboardShortcutsEnabled: boolean;
  language: LanguageId;
  lowBalanceAlertsEnabled: boolean;
  quickAddDefault: QuickAddDefaultId;
  updatedAt: string | null;
  weekStartsOn: "sunday" | "monday";
  weeklyDigestEnabled: boolean;
};

type DateFormatId = (typeof dateFormatOptions)[number]["id"];
type LanguageId = (typeof languageOptions)[number]["id"];
type QuickAddDefaultId = (typeof quickAddOptions)[number]["id"];

type SystemPreferencesRow = {
  auto_categorize_imports: boolean;
  budget_risk_alerts_enabled: boolean;
  command_palette_enabled: boolean;
  compact_numbers: boolean;
  date_format: string;
  due_bill_alerts_enabled: boolean;
  email_notifications_enabled: boolean;
  enter_to_submit: boolean;
  in_app_notifications_enabled: boolean;
  keyboard_shortcuts_enabled: boolean;
  language: string;
  low_balance_alerts_enabled: boolean;
  quick_add_default: string;
  updated_at: string | null;
  week_starts_on: string;
  weekly_digest_enabled: boolean;
};

export const defaultSystemPreferences: SystemPreferences = {
  autoCategorizeImports: true,
  budgetRiskAlertsEnabled: true,
  commandPaletteEnabled: true,
  compactNumbers: false,
  dateFormat: "dd/MM/yyyy",
  dueBillAlertsEnabled: true,
  emailNotificationsEnabled: false,
  enterToSubmit: false,
  inAppNotificationsEnabled: true,
  keyboardShortcutsEnabled: true,
  language: "pt-BR",
  lowBalanceAlertsEnabled: true,
  quickAddDefault: "transaction",
  updatedAt: null,
  weekStartsOn: "monday",
  weeklyDigestEnabled: false
};

export async function getSystemPreferences(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<SystemPreferences> {
  const { data, error } = await supabase
    .from("system_preferences")
    .select(
      [
        "language",
        "date_format",
        "week_starts_on",
        "keyboard_shortcuts_enabled",
        "command_palette_enabled",
        "quick_add_default",
        "enter_to_submit",
        "auto_categorize_imports",
        "compact_numbers",
        "in_app_notifications_enabled",
        "email_notifications_enabled",
        "due_bill_alerts_enabled",
        "low_balance_alerts_enabled",
        "budget_risk_alerts_enabled",
        "weekly_digest_enabled",
        "updated_at"
      ].join(",")
    )
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle<SystemPreferencesRow>();

  if (error) {
    if (error.code === "42P01" || error.code === "42703") {
      return defaultSystemPreferences;
    }

    throw error;
  }

  if (!data) {
    return defaultSystemPreferences;
  }

  return mapSystemPreferences(data);
}

export function normalizeCurrency(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "").trim().toUpperCase();
  return currencyOptions.some((option) => option.id === raw) ? raw : "BRL";
}

export function normalizeDateFormat(value: FormDataEntryValue | string | null): DateFormatId {
  const raw = String(value ?? "");
  return dateFormatOptions.some((option) => option.id === raw)
    ? (raw as DateFormatId)
    : defaultSystemPreferences.dateFormat;
}

export function normalizeLanguage(value: FormDataEntryValue | string | null): LanguageId {
  const raw = String(value ?? "");
  return languageOptions.some((option) => option.id === raw)
    ? (raw as LanguageId)
    : defaultSystemPreferences.language;
}

export function normalizeQuickAddDefault(value: FormDataEntryValue | string | null): QuickAddDefaultId {
  const raw = String(value ?? "");
  return quickAddOptions.some((option) => option.id === raw)
    ? (raw as QuickAddDefaultId)
    : defaultSystemPreferences.quickAddDefault;
}

export function normalizeWeekStart(value: FormDataEntryValue | string | null) {
  return String(value ?? "") === "sunday" ? "sunday" : "monday";
}

function mapSystemPreferences(row: SystemPreferencesRow): SystemPreferences {
  return {
    autoCategorizeImports: row.auto_categorize_imports,
    budgetRiskAlertsEnabled: row.budget_risk_alerts_enabled,
    commandPaletteEnabled: row.command_palette_enabled,
    compactNumbers: row.compact_numbers,
    dateFormat: normalizeDateFormat(row.date_format),
    dueBillAlertsEnabled: row.due_bill_alerts_enabled,
    emailNotificationsEnabled: row.email_notifications_enabled,
    enterToSubmit: row.enter_to_submit,
    inAppNotificationsEnabled: row.in_app_notifications_enabled,
    keyboardShortcutsEnabled: row.keyboard_shortcuts_enabled,
    language: normalizeLanguage(row.language),
    lowBalanceAlertsEnabled: row.low_balance_alerts_enabled,
    quickAddDefault: normalizeQuickAddDefault(row.quick_add_default),
    updatedAt: row.updated_at,
    weekStartsOn: normalizeWeekStart(row.week_starts_on),
    weeklyDigestEnabled: row.weekly_digest_enabled
  };
}
