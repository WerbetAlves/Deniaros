import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { TransactionRecordEditor } from "@/components/transaction-record-editor";
import {
  mapWorkspaceAccount,
  mapWorkspaceCategory,
  mapWorkspacePayee,
  mapWorkspaceTransaction,
  WorkspaceAccountRow,
  WorkspaceCategoryRow,
  WorkspacePayeeRow,
  WorkspaceTransactionRow
} from "@/lib/finance-admin";
import { formatCurrency, getPendingNetChange, getPostedExpenses, getPostedIncome } from "@/lib/finance";
import { getWorkspaceContext } from "@/lib/workspace-context";
import {
  deleteTransaction,
  setTransactionReconciliation,
  updateTransaction
} from "@/app/transactions/actions";

type TransactionAuditEventRow = {
  after_status: string | null;
  before_status: string | null;
  created_at: string;
  event_type:
    | "transaction_created"
    | "transaction_updated"
    | "transaction_deleted"
    | "transaction_reconciled"
    | "transaction_unreconciled"
    | "manual_adjustment"
    | "imported_posted"
    | "imported_deleted"
    | "scheduled_settled";
  id: string;
  metadata: Record<string, unknown>;
  note: string | null;
  transaction_id: string | null;
};

export default async function TransactionsPage({
  searchParams
}: {
  searchParams: Promise<{
    accountId?: string;
    error?: string;
    focus?: string;
    source?: string;
    status?: string;
    success?: string;
  }>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const { accountId, error, focus, source, status, success } = await searchParams;
  const [accountsResult, categoriesResult, payeesResult, transactionsResult, workspaceResult, auditEventsResult] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id,workspace_id,name,type,opening_balance,currency,color,is_active")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true }),
      supabase
        .from("categories")
        .select("id,workspace_id,parent_id,name,kind")
        .eq("workspace_id", workspaceId)
        .order("name", { ascending: true }),
      supabase
        .from("payees")
        .select("id,workspace_id,name,type,notes")
        .eq("workspace_id", workspaceId)
        .order("name", { ascending: true }),
      supabase
        .from("transactions")
        .select(
          "id,workspace_id,account_id,transfer_account_id,category_id,payee_id,description,amount,currency,occurred_on,status,source,scheduled_item_id,scheduled_occurrence_date,reconciled_at,reconciled_by"
        )
        .eq("workspace_id", workspaceId)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("workspaces")
        .select("base_currency,locale")
        .eq("id", workspaceId)
        .single<{ base_currency: string; locale: string }>(),
      supabase
        .from("transaction_audit_events")
        .select("id,transaction_id,event_type,before_status,after_status,note,metadata,created_at")
        .eq("workspace_id", workspaceId)
        .in("event_type", [
          "transaction_created",
          "transaction_updated",
          "transaction_deleted",
          "transaction_reconciled",
          "transaction_unreconciled",
          "manual_adjustment",
          "imported_posted",
          "imported_deleted",
          "scheduled_settled"
        ])
        .order("created_at", { ascending: false })
        .limit(12)
        .returns<TransactionAuditEventRow[]>()
    ]);

  const loadError =
    accountsResult.error ||
    categoriesResult.error ||
    payeesResult.error ||
    transactionsResult.error ||
    workspaceResult.error;
  const accounts = ((accountsResult.data ?? []) as WorkspaceAccountRow[]).map(mapWorkspaceAccount);
  const categories = ((categoriesResult.data ?? []) as WorkspaceCategoryRow[]).map(mapWorkspaceCategory);
  const payees = ((payeesResult.data ?? []) as WorkspacePayeeRow[]).map(mapWorkspacePayee);
  const allTransactions = ((transactionsResult.data ?? []) as WorkspaceTransactionRow[]).map(
    mapWorkspaceTransaction
  );
  const auditMigrationMissing = auditEventsResult.error?.code === "42P01";
  const auditLoadError =
    auditEventsResult.error && auditEventsResult.error.code !== "42P01"
      ? auditEventsResult.error
      : null;
  const auditEvents = auditEventsResult.data ?? [];
  const selectedStatus = status === "posted" || status === "pending" ? status : "all";
  const selectedSource =
    source === "manual" ||
    source === "imported" ||
    source === "openfinance" ||
    source === "recurring" ||
    source === "assistant"
      ? source
      : "all";
  const selectedAccountId = accounts.some((account) => account.id === accountId) ? accountId ?? "all" : "all";
  const transactions = allTransactions.filter((transaction) => {
    const statusMatches = selectedStatus === "all" || transaction.status === selectedStatus;
    const sourceMatches = selectedSource === "all" || transaction.source === selectedSource;
    const accountMatches =
      selectedAccountId === "all" ||
      transaction.accountId === selectedAccountId ||
      transaction.transferAccountId === selectedAccountId;
    return statusMatches && sourceMatches && accountMatches;
  });
  const focusedTransaction = focus
    ? allTransactions.find((transaction) => transaction.id === focus)
    : undefined;
  const visibleTransactions = focusedTransaction ? [focusedTransaction] : transactions;
  const workspaceSettings = workspaceResult.data ?? { base_currency: "BRL", locale: "pt-BR" };
  const postedIncome = getPostedIncome(transactions);
  const postedExpenses = getPostedExpenses(transactions);
  const pendingNetChange = getPendingNetChange(transactions);
  const transfersCount = transactions.filter((transaction) => transaction.transferAccountId).length;
  const pendingCount = transactions.filter((transaction) => transaction.status === "pending").length;
  const importedCount = transactions.filter(
    (transaction) => transaction.source === "imported" || transaction.source === "openfinance"
  ).length;
  const unclassifiedCount = transactions.filter(
    (transaction) => !transaction.transferAccountId && !transaction.categoryId
  ).length;
  const actionCards = [
    {
      action: pendingCount ? "Conferir agora" : "Criar lançamento",
      description: pendingCount
        ? "Movimentos pendentes ainda não entram no saldo real. Resolva primeiro para limpar a leitura."
        : "Sem pendências no filtro atual. Continue registrando no momento em que a vida acontece.",
      href: pendingCount ? "/transactions?status=pending" : "/transactions/new",
      metric: String(pendingCount),
      tone: pendingCount ? "attention" : "stable",
      title: "Pendências"
    },
    {
      action: unclassifiedCount ? "Classificar" : "Ver relatórios",
      description: unclassifiedCount
        ? "Sem categoria, o passado vira ruído. Classifique para o Deniaros projetar melhor o futuro."
        : "As categorias do filtro atual estão prontas para virar relatório e decisão.",
      href: unclassifiedCount
        ? "/transactions"
        : "/reports?section=habits&report=where-money-goes",
      metric: String(unclassifiedCount),
      tone: unclassifiedCount ? "attention" : "stable",
      title: "Sem categoria"
    },
    {
      action: importedCount ? "Revisar origem" : "Importar extrato",
      description: importedCount
        ? "Movimentos vindos de importação ou Open Finance merecem conferência antes de virarem rotina."
        : "Traga um extrato para reduzir digitação manual e acelerar o histórico financeiro.",
      href: importedCount ? "/transactions?source=imported" : "/imports",
      metric: String(importedCount),
      tone: importedCount ? "stable" : "attention",
      title: "Importados"
    }
  ];

  return (
    <AppShell userEmail={user.email}>
      <section className="module-page">
        <div className="module-hero panel">
          <div>
            <p className="section-label">Money99 clássico</p>
            <h2>Lançamentos</h2>
            <p className="supporting-copy">
              Este é o registro central do arquivo financeiro: receitas,
              despesas e transferências internas em uma linha do tempo viva,
              editável e coerente com as contas.
            </p>
          </div>
          <div className="profile-badges">
            <Link className="primary-button" href="/transactions/new">
              Novo movimento
            </Link>
          </div>
        </div>

        {loadError ? (
          <section className="source-banner">
            <strong>Base principal indisponível</strong>
            <span>{getTransactionsLoadErrorMessage(loadError)}</span>
          </section>
        ) : null}

        {auditMigrationMissing ? (
          <section className="source-banner">
            <strong>Historico detalhado temporariamente indisponivel</strong>
            <span>
              A linha do tempo de alteracoes dos lancamentos ainda nao esta disponivel neste ambiente.
            </span>
          </section>
        ) : null}

        {auditLoadError ? <p className="form-error">{auditLoadError.message}</p> : null}

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        <div className="summary-strip">
          <article className="panel summary-card">
            <p className="section-label">Receitas</p>
            <strong>
              {formatCurrency(postedIncome, workspaceSettings.base_currency, workspaceSettings.locale)}
            </strong>
            <p>Total de entradas reais, sem misturar transferências internas.</p>
          </article>
          <article className="panel summary-card">
            <p className="section-label">Despesas</p>
            <strong>
              {formatCurrency(postedExpenses, workspaceSettings.base_currency, workspaceSettings.locale)}
            </strong>
            <p>Saídas efetivas do arquivo financeiro já classificadas.</p>
          </article>
          <article className="panel summary-card">
            <p className="section-label">Transferências</p>
            <strong>{transfersCount}</strong>
            <p>Movimentos entre contas que agora respeitam a contabilidade interna.</p>
          </article>
          <article className="panel summary-card">
            <p className="section-label">Pendente</p>
            <strong className={pendingNetChange >= 0 ? "text-positive" : "text-negative"}>
              {formatCurrency(pendingNetChange, workspaceSettings.base_currency, workspaceSettings.locale)}
            </strong>
            <p>Variação ainda não lançada no saldo real.</p>
          </article>
        </div>

        <section className="transaction-action-panel">
          {actionCards.map((card) => (
            <article className={`transaction-action-card ${card.tone}`} key={card.title}>
              <div>
                <p className="section-label">{card.title}</p>
                <strong>{card.metric}</strong>
                <p>{card.description}</p>
              </div>
              <Link className="ghost-button" href={card.href}>
                {card.action}
              </Link>
            </article>
          ))}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Filtro de leitura</p>
              <h3>Fonte e status do registro</h3>
            </div>
            <div className="profile-badges">
              <span className="status-chip">{pendingCount} pendente(s)</span>
              <span className="status-chip">{importedCount} importado(s)</span>
            </div>
          </div>

          <form className="entity-form compact-form" method="get">
            <label>
              Status
              <select defaultValue={selectedStatus} name="status">
                <option value="all">Todos</option>
                <option value="posted">Lançado</option>
                <option value="pending">Pendente</option>
              </select>
            </label>

            <label>
              Carteira
              <select defaultValue={selectedAccountId} name="accountId">
                <option value="all">Todas</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Fonte
              <select defaultValue={selectedSource} name="source">
                <option value="all">Todas</option>
                <option value="manual">Manual</option>
                <option value="imported">Importado</option>
                <option value="openfinance">Open Finance</option>
                <option value="recurring">Recorrência</option>
                <option value="assistant">Assistente</option>
              </select>
            </label>

            <div className="form-actions">
              <Link className="ghost-button" href="/transactions">
                Limpar filtro
              </Link>
              <button className="primary-button" type="submit">
                Aplicar filtro
              </button>
            </div>
          </form>
        </section>

        {auditEvents.length ? (
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Auditoria</p>
                <h3>Linha do tempo do registro</h3>
              </div>
              <span className="status-chip">{auditEvents.length} evento(s)</span>
            </div>
            <div className="record-list">
              {auditEvents.map((event) => {
                const amount = getAuditAmount(event.metadata);

                return (
                  <article className="record-card" key={event.id}>
                    <div className="record-headline">
                      <div>
                        <strong>{getAuditEventLabel(event.event_type)}</strong>
                        <p className="micro-copy">
                          {formatAuditDateTime(event.created_at, workspaceSettings.locale)} |{" "}
                          {getAuditDescription(event.metadata)}
                        </p>
                        {event.note ? <p className="micro-copy">{event.note}</p> : null}
                      </div>
                      <div className="record-badge-row">
                        {event.before_status ? (
                          <span className="status-chip">Antes: {event.before_status}</span>
                        ) : null}
                        {event.after_status ? (
                          <span className="status-chip">Depois: {event.after_status}</span>
                        ) : null}
                        {amount !== null ? (
                          <strong className={amount >= 0 ? "text-positive" : "text-negative"}>
                            {formatCurrency(amount, workspaceSettings.base_currency, workspaceSettings.locale)}
                          </strong>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Registro completo</p>
              <h3>
                {focusedTransaction
                  ? "Edição detalhada do movimento selecionado"
                  : "Edição e classificação de movimentos"}
              </h3>
            </div>
            {focusedTransaction ? (
              <div className="profile-badges">
                <Link className="ghost-button" href="/transactions">
                  Voltar para lista completa
                </Link>
              </div>
            ) : null}
          </div>

          <div className="record-list">
            {visibleTransactions.length ? (
              visibleTransactions.map((transaction) => (
                <TransactionRecordEditor
                  accounts={accounts}
                  categories={categories}
                  deleteAction={deleteTransaction}
                  highlighted={focus === transaction.id}
                  key={transaction.id}
                  locale={workspaceSettings.locale}
                  payees={payees}
                  perspectiveAccountId={selectedAccountId === "all" ? undefined : selectedAccountId}
                  transaction={transaction}
                  reconciliationAction={setTransactionReconciliation}
                  updateAction={updateTransaction}
                />
              ))
            ) : focus ? (
              <article className="empty-state">
                <strong>Movimento selecionado não foi encontrado.</strong>
                <p>
                  O registro pode ter sido removido, ou você não tem permissao para visualizar
                  este movimento no filtro atual.
                </p>
                <Link className="ghost-button" href="/transactions">
                  Voltar para lista completa
                </Link>
              </article>
            ) : (
              <article className="empty-state">
                <strong>Nenhum movimento registrado ainda.</strong>
                <p>Comece criando receitas, despesas ou transferências para alimentar o livro caixa.</p>
              </article>
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}

function getAuditEventLabel(eventType: TransactionAuditEventRow["event_type"]) {
  const labels: Record<TransactionAuditEventRow["event_type"], string> = {
    imported_deleted: "Importado removido",
    imported_posted: "Importado conciliado",
    manual_adjustment: "Ajuste manual",
    scheduled_settled: "Agenda baixada",
    transaction_reconciled: "Movimento conferido",
    transaction_created: "Movimento criado",
    transaction_deleted: "Movimento removido",
    transaction_unreconciled: "Conferência removida",
    transaction_updated: "Movimento atualizado"
  };

  return labels[eventType] ?? "Evento registrado";
}

function getAuditDescription(metadata: Record<string, unknown>) {
  const after = readAuditObject(metadata.after);
  const before = readAuditObject(metadata.before);
  const transaction = readAuditObject(metadata.transaction);
  const description =
    readString(metadata.description) ??
    readString(after?.description) ??
    readString(before?.description) ??
    readString(transaction?.description);

  return description ?? "Movimento financeiro";
}

function getAuditAmount(metadata: Record<string, unknown>) {
  const after = readAuditObject(metadata.after);
  const before = readAuditObject(metadata.before);
  const transaction = readAuditObject(metadata.transaction);
  const amount =
    readNumber(metadata.amount) ??
    readNumber(after?.amount) ??
    readNumber(before?.amount) ??
    readNumber(transaction?.amount);

  return amount;
}

function readAuditObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function readNumber(value: unknown) {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function formatAuditDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function getTransactionsLoadErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === "42703") {
    return "A baixa de compromissos ainda nao esta disponivel neste ambiente.";
  }

  if (error.code === "42P01") {
    return "A base principal de lancamentos ainda nao esta disponivel neste ambiente.";
  }

  return "Nao conseguimos carregar a base principal de lancamentos agora. Tente novamente ou acione o suporte.";
}
