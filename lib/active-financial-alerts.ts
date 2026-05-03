import type { SupabaseClient } from "@supabase/supabase-js";
import type { SystemPreferences } from "@/lib/system-preferences";
import { formatCurrency } from "@/lib/finance";

type AccountRow = {
  currency: string;
  id: string;
  name: string;
  opening_balance: number | string;
};

type TransactionRow = {
  account_id: string;
  amount: number | string;
  category_id: string | null;
  occurred_on: string;
  status: string;
  transfer_account_id: string | null;
};

type ScheduledRow = {
  amount: number | string;
  due_on: string;
  id: string;
  kind: "bill" | "deposit" | "saving";
  status: string;
  title: string;
};

type CategoryRow = {
  id: string;
  name: string;
};

export type FinancialAlertTone = "info" | "warning" | "danger";

export type FinancialAlert = {
  body: string;
  href: string | null;
  id: string;
  kind: "negative_balance" | "due_bill" | "unusual_spending";
  severity: FinancialAlertTone;
  title: string;
};

type FinancialAlertRow = FinancialAlert & {
  status: string;
};

type GeneratedFinancialAlert = Omit<FinancialAlert, "id"> & {
  fingerprint: string;
  metadata: Record<string, unknown>;
};

type ExistingAlertFingerprintRow = {
  fingerprint: string;
  id: string;
  status: string;
};

export async function syncActiveFinancialAlerts({
  locale = "pt-BR",
  preferences,
  supabase,
  workspaceId
}: {
  locale?: string;
  preferences: SystemPreferences;
  supabase: SupabaseClient;
  workspaceId: string;
}) {
  if (!preferences.inAppNotificationsEnabled) {
    return [];
  }

  const generated = await generateFinancialAlerts({
    locale,
    preferences,
    supabase,
    workspaceId
  });
  const fingerprints = generated.map((alert) => alert.fingerprint);
  let existingMatchingAlerts: ExistingAlertFingerprintRow[] = [];

  if (fingerprints.length) {
    const { data, error } = await supabase
      .from("financial_alerts")
      .select("id,fingerprint,status")
      .eq("workspace_id", workspaceId)
      .in("fingerprint", fingerprints)
      .returns<ExistingAlertFingerprintRow[]>();

    if (error) {
      throw error;
    }

    existingMatchingAlerts = data ?? [];
  }

  const dismissedFingerprints = new Set(
    existingMatchingAlerts
      .filter((alert) => alert.status === "dismissed")
      .map((alert) => alert.fingerprint)
  );
  const alertsToPersist = generated.filter((alert) => !dismissedFingerprints.has(alert.fingerprint));

  if (alertsToPersist.length) {
    const { error } = await supabase.from("financial_alerts").upsert(
      alertsToPersist.map((alert) => ({
        body: alert.body,
        dismissed_at: null,
        fingerprint: alert.fingerprint,
        href: alert.href,
        kind: alert.kind,
        last_seen_at: new Date().toISOString(),
        metadata: alert.metadata,
        resolved_at: null,
        severity: alert.severity,
        status: "active",
        title: alert.title,
        updated_at: new Date().toISOString(),
        workspace_id: workspaceId
      })),
      { onConflict: "workspace_id,fingerprint" }
    );

    if (error) {
      throw error;
    }
  }

  const { data: existingAlerts, error: existingAlertsError } = await supabase
    .from("financial_alerts")
    .select("id,fingerprint,status")
    .eq("workspace_id", workspaceId)
    .in("status", ["active", "dismissed"])
    .returns<ExistingAlertFingerprintRow[]>();

  if (existingAlertsError) {
    throw existingAlertsError;
  }

  const activeFingerprintSet = new Set(fingerprints);
  const staleAlertIds = (existingAlerts ?? [])
    .filter((alert) => !activeFingerprintSet.has(alert.fingerprint))
    .map((alert) => alert.id);

  if (staleAlertIds.length) {
    const { error } = await supabase
      .from("financial_alerts")
      .update({
        resolved_at: new Date().toISOString(),
        status: "resolved",
        updated_at: new Date().toISOString()
      })
      .in("id", staleAlertIds);

    if (error) {
      throw error;
    }
  }

  const { data, error } = await supabase
    .from("financial_alerts")
    .select("id,kind,severity,title,body,href,status")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("severity", { ascending: true })
    .order("last_seen_at", { ascending: false })
    .limit(8)
    .returns<FinancialAlertRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((alert) => ({
    body: alert.body,
    href: alert.href,
    id: alert.id,
    kind: alert.kind,
    severity: alert.severity,
    title: alert.title
  }));
}

export async function dismissFinancialAlert({
  alertId,
  supabase,
  workspaceId
}: {
  alertId: string;
  supabase: SupabaseClient;
  workspaceId: string;
}) {
  const { error } = await supabase
    .from("financial_alerts")
    .update({
      dismissed_at: new Date().toISOString(),
      status: "dismissed",
      updated_at: new Date().toISOString()
    })
    .eq("id", alertId)
    .eq("workspace_id", workspaceId);

  if (error) {
    throw error;
  }
}

async function generateFinancialAlerts({
  locale,
  preferences,
  supabase,
  workspaceId
}: {
  locale: string;
  preferences: SystemPreferences;
  supabase: SupabaseClient;
  workspaceId: string;
}) {
  const today = toIsoDate(new Date());
  const nextWeek = toIsoDate(addDays(new Date(), 7));
  const fourMonthsAgo = toIsoDate(addMonths(new Date(), -4));
  const [accountsResult, transactionsResult, scheduledResult, categoriesResult] = await Promise.all([
    supabase
      .from("accounts")
      .select("id,name,opening_balance,currency")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .returns<AccountRow[]>(),
    supabase
      .from("transactions")
      .select("account_id,transfer_account_id,category_id,amount,occurred_on,status")
      .eq("workspace_id", workspaceId)
      .gte("occurred_on", fourMonthsAgo)
      .returns<TransactionRow[]>(),
    supabase
      .from("scheduled_items")
      .select("id,title,kind,amount,due_on,status")
      .eq("workspace_id", workspaceId)
      .neq("status", "paid")
      .lte("due_on", nextWeek)
      .returns<ScheduledRow[]>(),
    supabase
      .from("categories")
      .select("id,name")
      .eq("workspace_id", workspaceId)
      .returns<CategoryRow[]>()
  ]);
  const alerts: GeneratedFinancialAlert[] = [];
  const accounts = accountsResult.data ?? [];
  const transactions = transactionsResult.data ?? [];
  const scheduled = scheduledResult.data ?? [];
  const categoriesById = new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name]));

  if (preferences.lowBalanceAlertsEnabled) {
    alerts.push(...buildNegativeBalanceAlerts(accounts, transactions, locale));
  }

  if (preferences.dueBillAlertsEnabled) {
    alerts.push(...buildDueBillAlerts(scheduled, today, locale));
  }

  if (preferences.budgetRiskAlertsEnabled) {
    alerts.push(...buildUnusualSpendingAlerts(transactions, categoriesById, locale));
  }

  return alerts;
}

function buildNegativeBalanceAlerts(
  accounts: AccountRow[],
  transactions: TransactionRow[],
  locale: string
) {
  const transactionTotals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.status !== "posted") {
      continue;
    }

    const amount = Number(transaction.amount);
    transactionTotals.set(transaction.account_id, (transactionTotals.get(transaction.account_id) ?? 0) + amount);

    if (transaction.transfer_account_id) {
      transactionTotals.set(
        transaction.transfer_account_id,
        (transactionTotals.get(transaction.transfer_account_id) ?? 0) - amount
      );
    }
  }

  return accounts
    .map((account) => ({
      account,
      balance: Number(account.opening_balance) + (transactionTotals.get(account.id) ?? 0)
    }))
    .filter(({ balance }) => balance < 0)
    .slice(0, 3)
    .map<GeneratedFinancialAlert>(({ account, balance }) => ({
      body: `${account.name} esta negativa em ${formatCurrency(balance, account.currency, locale)}.`,
      fingerprint: `negative-balance:${account.id}`,
      href: "/accounts",
      kind: "negative_balance",
      metadata: { accountId: account.id, balance },
      severity: "danger",
      title: "Saldo negativo detectado"
    }));
}

function buildDueBillAlerts(
  scheduled: ScheduledRow[],
  today: string,
  locale: string
) {
  return scheduled
    .filter((item) => item.kind === "bill" || Number(item.amount) < 0)
    .sort((a, b) => a.due_on.localeCompare(b.due_on))
    .slice(0, 5)
    .map<GeneratedFinancialAlert>((item) => {
      const isOverdue = item.due_on < today || item.status === "overdue";
      const amount = Math.abs(Number(item.amount));

      return {
        body: `${item.title} ${isOverdue ? "venceu" : "vence"} em ${formatDate(item.due_on, locale)} no valor de ${formatCurrency(amount, "BRL", locale)}.`,
        fingerprint: `due-bill:${item.id}`,
        href: "/financial-agenda",
        kind: "due_bill",
        metadata: { amount, dueOn: item.due_on, scheduledItemId: item.id },
        severity: isOverdue ? "danger" : "warning",
        title: isOverdue ? "Conta vencida" : "Conta vencendo"
      };
    });
}

function buildUnusualSpendingAlerts(
  transactions: TransactionRow[],
  categoriesById: Map<string, string>,
  locale: string
) {
  const monthKey = getMonthKey(new Date());
  const totals = new Map<string, Map<string, number>>();

  for (const transaction of transactions) {
    if (transaction.status !== "posted" || transaction.transfer_account_id || Number(transaction.amount) >= 0) {
      continue;
    }

    const key = transaction.category_id ?? "sem-categoria";
    const period = transaction.occurred_on.slice(0, 7);
    const bucket = totals.get(key) ?? new Map<string, number>();
    bucket.set(period, (bucket.get(period) ?? 0) + Math.abs(Number(transaction.amount)));
    totals.set(key, bucket);
  }

  const alerts: GeneratedFinancialAlert[] = [];

  for (const [categoryId, byMonth] of totals) {
    const current = byMonth.get(monthKey) ?? 0;
    const previous = [...byMonth.entries()]
      .filter(([period]) => period !== monthKey)
      .map(([, value]) => value)
      .filter((value) => value > 0);
    const average = previous.length
      ? previous.reduce((total, value) => total + value, 0) / previous.length
      : 0;

    if (current < 100 || average <= 0 || current < average * 1.5) {
      continue;
    }

    const categoryName = categoryId === "sem-categoria" ? "Sem categoria" : categoriesById.get(categoryId) ?? "Categoria";

    alerts.push({
      body: `${categoryName}: ${formatCurrency(current, "BRL", locale)} ficou ${Math.round((current / average - 1) * 100)}% acima da media recente.`,
      fingerprint: `unusual-spending:${categoryId}:${monthKey}`,
      href: "/reports?section=habits&report=expenses-by-category&period=month",
      kind: "unusual_spending",
      metadata: { average, categoryId, current, monthKey },
      severity: current >= average * 2 ? "danger" : "warning",
      title: categoryId === "sem-categoria" ? "Gasto sem categoria fora do padrao" : `Gasto fora do padrao: ${categoryName}`
    });
  }

  return alerts.sort((a, b) => Number(b.metadata.current ?? 0) - Number(a.metadata.current ?? 0)).slice(0, 3);
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short"
  }).format(new Date(`${value}T12:00:00`));
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
