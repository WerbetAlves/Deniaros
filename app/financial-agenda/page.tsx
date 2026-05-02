import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import { FinancialAgendaWorkspace } from "@/components/financial-agenda-workspace";
import { getFinancialData } from "@/lib/financial-data";
import {
  buildForecastProjection,
  getAccountBalances,
  getTotalBalance
} from "@/lib/finance";
import {
  mapWorkspaceScheduledItem,
  WorkspaceScheduledItemRow
} from "@/lib/finance-admin";
import { getWorkspaceContext } from "@/lib/workspace-context";

type AgendaAuditEventRow = {
  after_status: string | null;
  before_status: string | null;
  created_at: string;
  event_type: "scheduled_settled" | "scheduled_updated" | "scheduled_deleted";
  id: string;
  metadata: Record<string, unknown>;
  note: string | null;
  transaction_id: string | null;
};

type SettledAgendaTransactionRow = {
  account_id: string;
  amount: number | string;
  currency: string;
  description: string;
  id: string;
  occurred_on: string;
  payee_id: string | null;
  scheduled_item_id: string | null;
  scheduled_occurrence_date: string | null;
};

export default async function FinancialAgendaPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const { accounts, categories, fallbackReason, payees, scheduledItems, source, transactions, workspace } =
    await getFinancialData({ supabase, user, workspaceId });
  const { error, success } = await searchParams;
  const [agendaResult, auditEventsResult, settledTransactionsResult] = await Promise.all([
    supabase
      .from("scheduled_items")
      .select("id,workspace_id,kind,account_id,category_id,payee_id,title,amount,currency,due_on,recurrence,status")
      .eq("workspace_id", workspaceId)
      .order("due_on", { ascending: true })
      .returns<WorkspaceScheduledItemRow[]>(),
    supabase
      .from("transaction_audit_events")
      .select("id,transaction_id,event_type,before_status,after_status,note,metadata,created_at")
      .eq("workspace_id", workspaceId)
      .in("event_type", ["scheduled_settled", "scheduled_updated", "scheduled_deleted"])
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<AgendaAuditEventRow[]>(),
    supabase
      .from("transactions")
      .select("id,account_id,payee_id,description,amount,currency,occurred_on,scheduled_item_id,scheduled_occurrence_date")
      .eq("workspace_id", workspaceId)
      .eq("source", "recurring")
      .not("scheduled_item_id", "is", null)
      .order("occurred_on", { ascending: false })
      .limit(12)
      .returns<SettledAgendaTransactionRow[]>()
  ]);

  const agendaItems = agendaResult.error ? scheduledItems : (agendaResult.data ?? []).map(mapWorkspaceScheduledItem);
  const auditEvents = auditEventsResult.error ? [] : auditEventsResult.data ?? [];
  const settledTransactions = (settledTransactionsResult.data ?? []).map((transaction) => ({
    accountId: transaction.account_id,
    amount: Number(transaction.amount ?? 0),
    currency: transaction.currency,
    date: transaction.occurred_on,
    description: transaction.description,
    id: transaction.id,
    payeeId: transaction.payee_id ?? undefined,
    scheduledItemId: transaction.scheduled_item_id ?? undefined,
    scheduledOccurrenceDate: transaction.scheduled_occurrence_date ?? undefined
  }));
  const auditLoadError =
    auditEventsResult.error && auditEventsResult.error.code !== "42P01"
      ? "Não foi possível carregar a auditoria da agenda."
      : undefined;
  const auditMigrationMissing = auditEventsResult.error?.code === "42P01";
  const settlementTraceMigrationMissing = settledTransactionsResult.error?.code === "42703";
  const accountBalances = getAccountBalances(accounts, transactions);
  const projection = buildForecastProjection({
    currentBalance: getTotalBalance(accountBalances),
    scheduledItems: agendaItems,
    horizonDays: 90
  });

  return (
    <AppShell user={user} userEmail={user.email} workspaceId={workspace.id}>
      <DataSourceBanner fallbackReason={fallbackReason} source={source} />
      <FinancialAgendaWorkspace
        accounts={accounts}
        categories={categories}
        error={error}
        items={agendaItems}
        loadError={
          agendaResult.error
            ? "A agenda financeira ainda nao esta disponivel neste ambiente."
            : undefined
        }
        auditEvents={auditEvents}
        auditLoadError={auditLoadError}
        auditMigrationMissing={auditMigrationMissing || settlementTraceMigrationMissing}
        payees={payees}
        projection={projection}
        settledTransactions={settlementTraceMigrationMissing ? [] : settledTransactions}
        success={success}
        workspace={workspace}
      />
    </AppShell>
  );
}
