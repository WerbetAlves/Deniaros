import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getFinancialData } from "@/lib/financial-data";
import {
  accountGroupLabels,
  accountGroupOptions,
  accountConnectionModeOptions,
  accountColorOptions,
  accountTypeLabels,
  accountTypeOptions,
  mapWorkspaceAccount,
  type AccountConnectionMode,
  type OpenFinanceStatus,
  openFinanceStatusLabels,
  openFinanceStatusOptions,
  type AccountGroup,
  WorkspaceAccountRow
} from "@/lib/finance-admin";
import type { Account, Transaction } from "@/lib/domain";
import {
  formatCurrency,
  formatShortDate,
  getAccountBalances,
  getTransactionAmountForAccount
} from "@/lib/finance";
import { getWorkspaceContext } from "@/lib/workspace-context";
import {
  archiveAccount,
  createAccount,
  createAccountReconciliationCheck,
  restoreAccount,
  updateAccount
} from "@/app/accounts/actions";
import { setTransactionReconciliation } from "@/app/transactions/actions";

const sourceLabels: Record<string, string> = {
  assistant: "Assistente",
  imported: "Importado",
  manual: "Manual",
  openfinance: "Open Finance",
  recurring: "Recorrente"
};

const movementStatusOptions = [
  { id: "all", label: "Todos" },
  { id: "posted", label: "Lançados" },
  { id: "pending", label: "Pendentes" }
] as const;

const movementSourceOptions = [
  { id: "all", label: "Todas" },
  { id: "manual", label: "Manual" },
  { id: "imported", label: "Importado" },
  { id: "openfinance", label: "Open Finance" },
  { id: "recurring", label: "Recorrência" },
  { id: "assistant", label: "Assistente" }
] as const;

const movementPeriodOptions = [
  { id: "30", label: "Últimos 30 dias" },
  { id: "90", label: "Últimos 90 dias" },
  { id: "365", label: "Últimos 12 meses" },
  { id: "all", label: "Todo o histórico" }
] as const;

type MovementStatusFilter = (typeof movementStatusOptions)[number]["id"];
type MovementSourceFilter = (typeof movementSourceOptions)[number]["id"];
type MovementPeriodFilter = (typeof movementPeriodOptions)[number]["id"];

type MovementFilters = {
  period: MovementPeriodFilter;
  source: MovementSourceFilter;
  status: MovementStatusFilter;
};

type AccountCreatePreset = {
  title: string;
  description: string;
  type: Account["type"];
  connectionMode: AccountConnectionMode;
  openFinanceStatus: OpenFinanceStatus;
  accountGroup: AccountGroup;
  color: (typeof accountColorOptions)[number]["id"];
  providerPlaceholder: string;
  namePlaceholder: string;
};

const accountCreateChoices: Array<AccountCreatePreset & { id: string; href: string; marker: string }> = [
  {
    id: "cash",
    href: "/accounts?mode=create&kind=cash",
    marker: "CF",
    title: "Carteira física",
    description: "Dinheiro em mãos, caixa, envelope ou reserva sem vínculo bancário.",
    type: "cash",
    connectionMode: "manual",
    openFinanceStatus: "not_connected",
    accountGroup: "daily_spending",
    color: "emerald",
    providerPlaceholder: "Ex.: Caixa pessoal",
    namePlaceholder: "Ex.: Carteira física"
  },
  {
    id: "manual-bank",
    href: "/accounts?mode=create&kind=manual-bank",
    marker: "CB",
    title: "Conta bancária manual",
    description: "Conta corrente controlada por lançamentos manuais e conciliação própria.",
    type: "checking",
    connectionMode: "manual",
    openFinanceStatus: "not_connected",
    accountGroup: "daily_spending",
    color: "blue",
    providerPlaceholder: "Ex.: Banco Inter, Nubank",
    namePlaceholder: "Ex.: Conta principal"
  },
  {
    id: "openfinance",
    href: "/accounts?mode=create&kind=openfinance",
    marker: "OF",
    title: "Open Finance",
    description: "Conexão direta com o banco para o Deniaros reconhecer a conta online.",
    type: "checking",
    connectionMode: "openfinance",
    openFinanceStatus: "pending",
    accountGroup: "daily_spending",
    color: "gold",
    providerPlaceholder: "Ex.: Banco conectado",
    namePlaceholder: "Ex.: Conta conectada"
  },
  {
    id: "credit",
    href: "/accounts?mode=create&kind=credit",
    marker: "CC",
    title: "Cartão de crédito",
    description: "Limite, compras e faturas acompanhadas como dívida rotativa.",
    type: "credit",
    connectionMode: "manual",
    openFinanceStatus: "not_connected",
    accountGroup: "debt",
    color: "violet",
    providerPlaceholder: "Ex.: Banco do cartão",
    namePlaceholder: "Ex.: Cartão principal"
  },
  {
    id: "asset",
    href: "/accounts?mode=create&kind=asset",
    marker: "AT",
    title: "Ativo patrimonial",
    description: "Casa, carro, equipamento ou bem relevante para o patrimônio.",
    type: "asset",
    connectionMode: "manual",
    openFinanceStatus: "not_connected",
    accountGroup: "long_term_savings",
    color: "gold",
    providerPlaceholder: "Ex.: Patrimônio",
    namePlaceholder: "Ex.: Apartamento"
  },
  {
    id: "loan",
    href: "/accounts?mode=create&kind=loan",
    marker: "EP",
    title: "Empréstimo ou financiamento",
    description: "Dívidas amortizadas, financiamento imobiliário, veículo ou crédito pessoal.",
    type: "loan",
    connectionMode: "manual",
    openFinanceStatus: "not_connected",
    accountGroup: "debt",
    color: "blue",
    providerPlaceholder: "Ex.: Banco financiador",
    namePlaceholder: "Ex.: Financiamento do carro"
  },
  {
    id: "investment",
    href: "/accounts?mode=create&kind=investment",
    marker: "IV",
    title: "Conta de investimento",
    description: "Corretora, carteira de ativos e dinheiro reservado para investimentos.",
    type: "investment",
    connectionMode: "manual",
    openFinanceStatus: "not_connected",
    accountGroup: "long_term_savings",
    color: "emerald",
    providerPlaceholder: "Ex.: Corretora",
    namePlaceholder: "Ex.: Corretora principal"
  },
  {
    id: "retirement",
    href: "/accounts?mode=create&kind=retirement",
    marker: "AP",
    title: "Aposentadoria",
    description: "Previdência, fundo de longo prazo ou reserva para independência financeira.",
    type: "retirement",
    connectionMode: "manual",
    openFinanceStatus: "not_connected",
    accountGroup: "retirement",
    color: "gold",
    providerPlaceholder: "Ex.: Previdência privada",
    namePlaceholder: "Ex.: Aposentadoria"
  }
];

type AccountWithBalance = ReturnType<typeof mapWorkspaceAccount> & { currentBalance: number };

type AccountReconciliationCheckRow = {
  id: string;
  account_id: string;
  checked_on: string;
  created_at: string;
  deniaros_balance: number | string;
  difference: number | string;
  notes: string | null;
  statement_balance: number | string;
};

export default async function AccountsPage({
  searchParams
}: {
  searchParams: Promise<{
    accountId?: string;
    connection?: string;
    editId?: string;
    error?: string;
    kind?: string;
    mode?: string;
    period?: string;
    source?: string;
    status?: string;
    success?: string;
  }>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const { workspace, transactions, categories, payees } = await getFinancialData({
    supabase,
    user,
    workspaceId
  });
  const { accountId, connection, editId, error, kind, mode, period, source, status, success } = await searchParams;
  const { data, error: loadError } = await supabase
    .from("accounts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .returns<WorkspaceAccountRow[]>();

  const accounts = (data ?? []).map(mapWorkspaceAccount);
  const balanceById = new Map(
    getAccountBalances(accounts, transactions).map((account) => [account.id, account.currentBalance])
  );
  const accountsWithBalances = accounts.map((account) => ({
    ...account,
    currentBalance: balanceById.get(account.id) ?? account.openingBalance
  }));
  const activeAccounts = accountsWithBalances.filter((account) => account.isActive);
  const archivedAccounts = accountsWithBalances.length - activeAccounts.length;
  const favoriteAccounts = activeAccounts.filter((account) => account.isFavorite);
  const accountGroupSummaries = buildAccountGroupSummaries(activeAccounts);
  const debtTotal = activeAccounts.reduce(
    (total, account) => total + (account.accountGroup === "debt" ? Math.abs(Math.min(account.currentBalance, 0)) : 0),
    0
  );
  const assetTotal = activeAccounts.reduce(
    (total, account) => total + (account.accountGroup !== "debt" ? account.currentBalance : 0),
    0
  );
  const netWorth = assetTotal - debtTotal;
  const accountById = new Map(accountsWithBalances.map((account) => [account.id, account]));
  const payeeById = new Map(payees.map((payee) => [payee.id, payee]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const selectedAccountId =
    accountId && accountsWithBalances.some((account) => account.id === accountId) ? accountId : "all";
  const movementFilters: MovementFilters = {
    period: resolveMovementPeriod(period),
    source: resolveMovementSource(source),
    status: resolveMovementStatus(status)
  };
  const isChooseMode = mode === "choose";
  const isCreateMode = mode === "create";
  const createPreset = resolveAccountCreatePreset(kind, connection);
  const selectedEditId =
    editId && accountsWithBalances.some((account) => account.id === editId) ? editId : undefined;
  const accountInEdit = selectedEditId
    ? accountsWithBalances.find((account) => account.id === selectedEditId)
    : undefined;
  const isFormOpen = isChooseMode || isCreateMode || Boolean(accountInEdit);
  const selectedAccount = selectedAccountId === "all" ? undefined : accountById.get(selectedAccountId);

  const {
    activityRows,
    dailyFlow,
    postedExpenses,
    postedIncome
  } = buildAccountTransactionSummary(transactions, selectedAccountId, workspace.locale, 7, movementFilters);
  const ledgerSummary = buildAccountLedgerSummary(activeAccounts, transactions, selectedAccountId, movementFilters);
  const chart = buildCashflowChartGeometry(dailyFlow);
  const currentAccountsPath = buildAccountsHref({ accountId: selectedAccountId, filters: movementFilters });
  let reconciliationChecks: AccountReconciliationCheckRow[] = [];
  let reconciliationCheckLoadError: string | undefined;

  if (selectedAccount) {
    const { data: checkRows, error: checkRowsError } = await supabase
      .from("account_reconciliation_checks")
      .select("id,account_id,checked_on,statement_balance,deniaros_balance,difference,notes,created_at")
      .eq("workspace_id", workspaceId)
      .eq("account_id", selectedAccount.id)
      .order("checked_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<AccountReconciliationCheckRow[]>();

    reconciliationChecks = checkRows ?? [];

    if (checkRowsError && (checkRowsError.code === "42P01" || checkRowsError.code === "42703")) {
      reconciliationCheckLoadError =
        "Execute a migration 0025_account_reconciliation_checks.sql para salvar conferências de saldo.";
    } else if (checkRowsError) {
      reconciliationCheckLoadError = checkRowsError.message;
    }
  }

  const selectedReconciledBalance = selectedAccount
    ? calculateReconciledAccountBalance(selectedAccount, transactions)
    : ledgerSummary.currentBalance;
  const latestReconciliationCheck = reconciliationChecks[0];
  const latestDifference = latestReconciliationCheck
    ? Number(latestReconciliationCheck.difference ?? 0)
    : 0;

  const totalBalance = activeAccounts.reduce((total, account) => total + account.currentBalance, 0);

  return (
    <AppShell userEmail={user.email}>
      <section className="module-page">
        <div className="module-hero panel">
          <div>
            <p className="section-label">Gestão de carteiras</p>
            <h2>Carteiras</h2>
            <p className="supporting-copy">
              Painel executivo para gerenciar contas, carteiras, cartões, ativos, dívidas e
              histórico financeiro sem perder a fluidez do dia a dia.
            </p>
          </div>
          <div className="profile-badges">
            <Link className="primary-button" href="/transactions/new">
              Novo movimento
            </Link>
          </div>
        </div>

        <div className="wallet-journey-strip">
          <article>
            <span>Gerenciador</span>
            <strong>Resumo por conta</strong>
            <p>Veja saldos, status, favoritos, grupos e edição em um só lugar.</p>
          </article>
          <article>
            <span>Movimentação</span>
            <strong>Histórico e lançamentos</strong>
            <p>Entre, filtre e edite movimentos pelo contexto da conta.</p>
          </article>
          <article>
            <span>Estrutura</span>
            <strong>Grupos financeiros</strong>
            <p>Separe uso diário, poupança, patrimônio, aposentadoria e dívidas.</p>
          </article>
        </div>

        {loadError ? (
          <section className="source-banner">
            <strong>Base principal indisponível</strong>
            <span>
              Execute as migrations do projeto, incluindo a
              `0006_account_openfinance.sql` e a `0023_money99_account_structure.sql`,
              para ativar todas as colunas de carteiras, grupos e conexão bancária.
            </span>
          </section>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        <section className="accounts-top-strip">
          <article className="panel account-summary-card account-summary-card-main">
            <p className="section-label">Saldo total</p>
            <strong>{formatCurrency(totalBalance, workspace.baseCurrency, workspace.locale)}</strong>
          </article>
          <article className="panel account-summary-card">
            <p className="section-label">Patrimônio líquido</p>
            <strong>{formatCurrency(netWorth, workspace.baseCurrency, workspace.locale)}</strong>
          </article>
          <article className="panel account-summary-card">
            <p className="section-label">Entradas</p>
            <strong>{formatCurrency(postedIncome, workspace.baseCurrency, workspace.locale)}</strong>
          </article>
          <article className="panel account-summary-card">
            <p className="section-label">Saídas</p>
            <strong>{formatCurrency(postedExpenses, workspace.baseCurrency, workspace.locale)}</strong>
          </article>
        </section>

        <section className="panel account-structure-panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Estrutura herdada do Money 99</p>
              <h3>Suas contas organizadas por papel financeiro</h3>
            </div>
            <span className="status-chip">{favoriteAccounts.length} favorita(s)</span>
          </div>

          <div className="account-group-grid">
            {accountGroupSummaries.map((group) => (
              <article className={`account-group-card ${group.id}`} key={group.id}>
                <p className="section-label">{group.count} conta(s)</p>
                <strong>{group.label}</strong>
                <span>{formatCurrency(group.balance, workspace.baseCurrency, workspace.locale)}</span>
                <p>{group.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel accounts-statement-panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Minhas carteiras</p>
              <h3>Visão consolidada por carteira</h3>
            </div>
            <span className="status-chip">{archivedAccounts} arquivada(s)</span>
          </div>

          <div className="accounts-wallet-grid">
            {activeAccounts.map((account) => (
              <article
                className={`wallet-card${selectedEditId === account.id ? " wallet-card-selected" : ""}`}
                key={account.id}
              >
                <Link className="wallet-card-main-link" href={`/accounts?editId=${account.id}`}>
                  <div className="wallet-card-head">
                    <span className={`account-swatch ${account.color}`} />
                    <div className="wallet-card-status-stack">
                      {account.isFavorite ? <span className="status-chip status-positive">Favorita</span> : null}
                      <span className="status-chip">
                        {openFinanceStatusLabels[account.openFinanceStatus]}
                      </span>
                    </div>
                  </div>
                  <p className="section-label">
                    {accountTypeLabels[account.type]} ({account.currency})
                  </p>
                  <strong>{account.name}</strong>
                  <p className="wallet-card-group">{accountGroupLabels[account.accountGroup]}</p>
                  <p className="wallet-card-balance">
                    {formatCurrency(account.currentBalance, account.currency, workspace.locale)}
                  </p>
                </Link>
                <div className="wallet-card-actions">
                  <Link className="ghost-button" href={`/transactions?accountId=${account.id}`}>
                    Ver movimentos
                  </Link>
                  <Link className="primary-button" href={`/transactions/new?accountId=${account.id}`}>
                    Novo movimento
                  </Link>
                  <Link className="ghost-button" href={`/accounts?editId=${account.id}`}>
                    Editar
                  </Link>
                </div>
              </article>
            ))}

            {!activeAccounts.length ? (
              <article className="empty-state wallet-empty-state">
                <strong>Nenhuma carteira ativa ainda.</strong>
                <p>Comece por uma carteira física, conta manual ou conexão Open Finance.</p>
              </article>
            ) : null}

            <Link className="wallet-add-card" href="/accounts?mode=choose">
              <span>+</span>
              <strong>Adicionar carteira</strong>
            </Link>
          </div>
        </section>

        <section className="panel account-ledger-panel">
          
            <div className="account-ledger-filter-row">
              <div>
                <p className="section-label">Detalhes da conta</p>
                <h4>{selectedAccount ? selectedAccount.name : "Todas as contas"}</h4>
              </div>
              <div className="accounts-filter-pills">
                <Link
                  className={`status-chip${selectedAccountId === "all" ? " status-positive" : ""}`}
                  href={buildAccountsHref({ accountId: "all", filters: movementFilters })}
                >
                  Geral
                </Link>
                {activeAccounts.map((account) => (
                  <Link
                    className={`status-chip${selectedAccountId === account.id ? " status-positive" : ""}`}
                    href={buildAccountsHref({ accountId: account.id, filters: movementFilters })}
                    key={`ledger-filter-${account.id}`}
                  >
                    {account.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="account-ledger-layout">
              <article className="account-ledger-identity">
                <div className="wallet-card-head">
                  <span className={`account-swatch ${selectedAccount?.color ?? "emerald"}`} />
                  <span className="status-chip">
                    {selectedAccount ? accountGroupLabels[selectedAccount.accountGroup] : `${activeAccounts.length} ativa(s)`}
                  </span>
                </div>
                <p className="section-label">
                  {selectedAccount ? accountTypeLabels[selectedAccount.type] : "Gerenciador de contas"}
                </p>
                <strong>{formatCurrency(ledgerSummary.currentBalance, workspace.baseCurrency, workspace.locale)}</strong>
                <p>{ledgerSummary.currentBalanceDescription}</p>
                <Link
                  className="ghost-button"
                  href={selectedAccount ? `/transactions?accountId=${selectedAccount.id}` : "/transactions"}
                >
                  Abrir movimentação
                </Link>
              </article>

              <div className="account-ledger-metrics-grid">
                <article>
                  <span>Saldo inicial</span>
                  <strong>{formatCurrency(ledgerSummary.openingBalance, workspace.baseCurrency, workspace.locale)}</strong>
                </article>
                <article>
                  <span>Entradas reais</span>
                  <strong className="text-positive">
                    {formatCurrency(ledgerSummary.income, workspace.baseCurrency, workspace.locale)}
                  </strong>
                </article>
                <article>
                  <span>Saídas reais</span>
                  <strong className="text-negative">
                    {formatCurrency(ledgerSummary.expenses, workspace.baseCurrency, workspace.locale)}
                  </strong>
                </article>
                <article>
                  <span>Transferências</span>
                  <strong>{formatCurrency(ledgerSummary.transferVolume, workspace.baseCurrency, workspace.locale)}</strong>
                </article>
              </div>

              <aside className="account-reconciliation-card">
                <p className="section-label">Conferência</p>
                <strong>{ledgerSummary.reconciliationTitle}</strong>
                <p>{ledgerSummary.reconciliationDescription}</p>
                <div className="account-reconciliation-stats">
                  <span>{ledgerSummary.transactionCount} movimento(s)</span>
                  <span>{ledgerSummary.reconciledCount} conferido(s)</span>
                  <span>{ledgerSummary.pendingCount} pendente(s)</span>
                  <span>{ledgerSummary.importedCount} importado(s)</span>
                </div>
              </aside>
            </div>

            <div className="account-balance-check-panel">
              <div>
                <p className="section-label">Saldo do extrato</p>
                <h4>Compare o banco com o Deniaros</h4>
                <p>
                  Use essa conferência para descobrir se o saldo real do banco bate com os
                  movimentos já marcados como conferidos.
                </p>
              </div>

              {selectedAccount ? (
                <>
                  <form action={createAccountReconciliationCheck} className="account-balance-check-form">
                    <input name="accountId" type="hidden" value={selectedAccount.id} />
                    <label>
                      Data da conferência
                      <input
                        defaultValue={new Date().toISOString().slice(0, 10)}
                        name="checkedOn"
                        type="date"
                      />
                    </label>
                    <label>
                      Saldo no banco/extrato
                      <input
                        defaultValue={formatMoneyInputValue(selectedReconciledBalance)}
                        name="statementBalance"
                        step="0.01"
                        type="number"
                      />
                    </label>
                    <label>
                      Observação
                      <input name="notes" placeholder="Ex.: extrato de abril conferido" />
                    </label>
                    <button className="primary-button" type="submit">
                      Comparar saldo
                    </button>
                  </form>

                  <div className="account-balance-check-summary">
                    <article>
                      <span>Saldo conferido no Deniaros</span>
                      <strong>
                        {formatCurrency(selectedReconciledBalance, selectedAccount.currency, workspace.locale)}
                      </strong>
                    </article>
                    <article className={Math.abs(latestDifference) < 0.01 ? "check-ok" : "check-warning"}>
                      <span>Última diferença</span>
                      <strong>
                        {latestReconciliationCheck
                          ? formatCurrency(latestDifference, selectedAccount.currency, workspace.locale)
                          : "Sem registro"}
                      </strong>
                    </article>
                  </div>

                  {reconciliationCheckLoadError ? (
                    <p className="form-error">{reconciliationCheckLoadError}</p>
                  ) : null}

                  {reconciliationChecks.length ? (
                    <div className="account-balance-check-history">
                      {reconciliationChecks.map((check) => {
                        const difference = Number(check.difference ?? 0);

                        return (
                          <article key={check.id}>
                            <div>
                              <strong>{formatShortDate(check.checked_on, workspace.locale)}</strong>
                              <p>{check.notes ?? "Conferência de saldo"}</p>
                            </div>
                            <span>
                              Banco {formatCurrency(Number(check.statement_balance), selectedAccount.currency, workspace.locale)}
                            </span>
                            <span>
                              Deniaros {formatCurrency(Number(check.deniaros_balance), selectedAccount.currency, workspace.locale)}
                            </span>
                            <span className={Math.abs(difference) < 0.01 ? "text-positive" : "text-negative"}>
                              Dif. {formatCurrency(difference, selectedAccount.currency, workspace.locale)}
                            </span>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="empty-inline">
                      Nenhuma conferência de saldo registrada para esta conta ainda.
                    </p>
                  )}
                </>
              ) : (
                <p className="empty-inline">
                  Escolha uma conta acima para comparar o saldo do extrato com o saldo conferido.
                </p>
              )}
            </div>
          </section>

        <section className="panel accounts-chart-panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Fluxo recente</p>
              <h3>Entradas vs Saídas (últimos 7 dias)</h3>
            </div>
            <div className="accounts-filter-pills">
              <Link
                className={`status-chip${selectedAccountId === "all" ? " status-positive" : ""}`}
                href={buildAccountsHref({ accountId: "all", filters: movementFilters })}
              >
                Todas
              </Link>
              {activeAccounts.map((account) => (
                <Link
                  className={`status-chip${selectedAccountId === account.id ? " status-positive" : ""}`}
                  href={buildAccountsHref({ accountId: account.id, filters: movementFilters })}
                  key={`filter-${account.id}`}
                >
                  {account.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="accounts-chart-canvas">
            <svg viewBox="0 0 920 260">
              {chart.gridLines.map((line) => (
                <line
                  className="accounts-chart-grid-line"
                  key={line.label}
                  x1={46}
                  x2={874}
                  y1={line.y}
                  y2={line.y}
                />
              ))}

              {dailyFlow.map((point, index) => (
                <text className="accounts-chart-label" key={point.key} x={chart.x[index]} y={244}>
                  {point.label}
                </text>
              ))}

              <path className="accounts-chart-income-area" d={chart.incomeArea} />
              <path className="accounts-chart-income-line" d={chart.incomeLine} />
              <path className="accounts-chart-expense-line" d={chart.expenseLine} />
            </svg>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Extrato inteligente</p>
              <h3>{selectedAccount ? `Movimentação de ${selectedAccount.name}` : "Movimentação consolidada"}</h3>
            </div>
            <div className="profile-badges">
              <span className="status-chip">{activityRows.length} visível(eis)</span>
              <Link className="primary-button" href="/transactions/new">
                Criar nova transação
              </Link>
            </div>
          </div>

          <form className="accounts-statement-filter" method="get">
            {selectedAccountId !== "all" ? <input name="accountId" type="hidden" value={selectedAccountId} /> : null}
            <label>
              Período
              <select defaultValue={movementFilters.period} name="period">
                {movementPeriodOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select defaultValue={movementFilters.status} name="status">
                {movementStatusOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Origem
              <select defaultValue={movementFilters.source} name="source">
                {movementSourceOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <Link
                className="ghost-button"
                href={selectedAccount ? `/accounts?accountId=${selectedAccount.id}` : "/accounts"}
              >
                Limpar
              </Link>
              <button className="primary-button" type="submit">
                Aplicar
              </button>
            </div>
          </form>

          <div className="accounts-transaction-table-shell">
            <table className="accounts-transaction-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Carteira</th>
                  <th>Origem</th>
                  <th>Status</th>
                  <th>Conferência</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {activityRows.length ? (
                  activityRows.map((item) => {
                    const category = item.categoryId ? categoryById.get(item.categoryId) : undefined;
                    const parentCategory = category?.parentId
                      ? categoryById.get(category.parentId)
                      : undefined;
                    const isTransfer = Boolean(item.transferAccountId);
                    const displayedAmount =
                      isTransfer
                        ? selectedAccountId === "all"
                          ? Math.abs(item.amount)
                          : getTransactionAmountForAccount(item, selectedAccountId)
                        : item.amount;
                    const categoryLabel = category
                      ? `${parentCategory ? `${parentCategory.name} / ` : ""}${category.name}`
                      : isTransfer
                        ? "Transferência interna"
                        : "Sem categoria";
                    const sourceAccountLabel = accountById.get(item.accountId)?.name ?? "Origem";
                    const destinationAccountLabel = item.transferAccountId
                      ? accountById.get(item.transferAccountId)?.name ?? "Destino"
                      : undefined;
                    const accountLabel =
                      isTransfer && destinationAccountLabel
                        ? `${sourceAccountLabel} -> ${destinationAccountLabel}`
                        : sourceAccountLabel;
                    const payeeLabel = item.payeeId ? payeeById.get(item.payeeId)?.name : undefined;
                    const editHref = `/transactions?focus=${item.id}#transaction-${item.id}`;
                    const amountClass = isTransfer
                      ? "text-transfer"
                      : displayedAmount >= 0
                        ? "text-positive"
                        : "text-negative";
                    const statusLabel = item.status === "posted" ? "Lançado" : "Pendente";
                    const isReconciled = Boolean(item.reconciledAt);

                    return (
                      <tr className="accounts-transaction-row" key={item.id}>
                        <td>
                          <Link className="transaction-row-link" href={editHref}>
                            {formatShortDate(item.date, workspace.locale)}
                          </Link>
                        </td>
                        <td>
                          <Link className="transaction-row-link" href={editHref}>
                            <strong>{item.description}</strong>
                            <p>{payeeLabel ?? "Abrir para editar"}</p>
                          </Link>
                        </td>
                        <td>
                          <Link className="transaction-row-link" href={editHref}>
                            {categoryLabel}
                          </Link>
                        </td>
                        <td>
                          <Link className="transaction-row-link" href={editHref}>
                            {accountLabel}
                          </Link>
                        </td>
                        <td>
                          <Link className="transaction-row-link" href={editHref}>
                            <span className={`source-chip source-${item.source}`}>
                              {sourceLabels[item.source] ?? "Manual"}
                            </span>
                          </Link>
                        </td>
                        <td>
                          <Link className="transaction-row-link" href={editHref}>
                            <span className={`source-chip statement-status-${item.status}`}>
                              {statusLabel}
                            </span>
                          </Link>
                        </td>
                        <td>
                          <form action={setTransactionReconciliation} className="statement-reconcile-form">
                            <input name="itemId" type="hidden" value={item.id} />
                            <input name="reconcile" type="hidden" value={isReconciled ? "false" : "true"} />
                            <input name="returnTo" type="hidden" value={currentAccountsPath} />
                            <button
                              className={`source-chip statement-reconcile-button ${
                                isReconciled ? "statement-status-posted" : "statement-status-pending"
                              }`}
                              disabled={item.status !== "posted"}
                              type="submit"
                            >
                              {isReconciled ? "Conferido" : "Conferir"}
                            </button>
                          </form>
                        </td>
                        <td className={amountClass}>
                          <Link className="transaction-row-link" href={editHref}>
                            {formatCurrency(displayedAmount, item.currency, workspace.locale)}
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="table-empty" colSpan={8}>
                      Nenhuma transação para o filtro selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {isFormOpen ? (
        <section className="wallet-modal-overlay" role="dialog" aria-modal="true">
          <div className="wallet-modal-backdrop" />
          <article className="wallet-modal-card">
            <header className="wallet-modal-head">
              <h3>{isChooseMode ? "Adicionar carteira" : isCreateMode ? createPreset.title : "Editar carteira"}</h3>
              <Link className="wallet-modal-close" href="/accounts">
                x
              </Link>
            </header>

            {isChooseMode ? (
              <div className="wallet-choice-grid">
                {accountCreateChoices.map((choice) => (
                  <Link className="wallet-choice-card" href={choice.href} key={choice.id}>
                    <span>{choice.marker}</span>
                    <strong>{choice.title}</strong>
                    <p>{choice.description}</p>
                  </Link>
                ))}
              </div>
            ) : isCreateMode ? (
              <>
                <article className="wallet-modal-openfinance-hero">
                  <strong>{createPreset.connectionMode === "openfinance" ? "OPEN FINANCE" : "GESTÃO MANUAL"}</strong>
                  <p>{createPreset.description}</p>
                </article>

              <form action={createAccount} className="wallet-modal-form">
                <input name="defaultCurrency" type="hidden" value={workspace.baseCurrency} />

                <label>
                  Nome da carteira
                  <input name="name" placeholder={createPreset.namePlaceholder} required />
                </label>

                <label>
                  Tipo de carteira
                  <select defaultValue={createPreset.type} name="type">
                    {accountTypeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Grupo financeiro
                  <select defaultValue={createPreset.accountGroup} name="accountGroup">
                    {accountGroupOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Saldo inicial
                  <input defaultValue="0" name="openingBalance" step="0.01" type="number" />
                </label>

                <label>
                  Moeda
                  <input
                    defaultValue={workspace.baseCurrency}
                    maxLength={3}
                    name="currency"
                    placeholder="BRL"
                  />
                </label>

                <label>
                  Banco/provedor
                  <input name="openFinanceProvider" placeholder={createPreset.providerPlaceholder} />
                </label>

                <label>
                  Conexão
                  <select defaultValue={createPreset.connectionMode} name="connectionMode">
                    {accountConnectionModeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Código de referência
                  <input name="externalAccountRef" placeholder="Ex.: ID externo da conta" />
                </label>

                <label>
                  Cor da carteira
                  <select defaultValue={createPreset.color} name="color">
                    {accountColorOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Status Open Finance
                  <select defaultValue={createPreset.openFinanceStatus} name="openFinanceStatus">
                    {openFinanceStatusOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="wallet-checkbox-label">
                  <input name="isFavorite" type="checkbox" />
                  Mostrar como conta favorita na Home e nos resumos
                </label>

                <div className="wallet-modal-actions">
                  <Link className="ghost-button" href="/accounts">
                    Cancelar
                  </Link>
                  <button className="primary-button" type="submit">
                    Salvar
                  </button>
                </div>
              </form>
              </>
            ) : accountInEdit ? (
              <form action={updateAccount} className="wallet-modal-form">
                <input name="itemId" type="hidden" value={accountInEdit.id} />
                <input name="defaultCurrency" type="hidden" value={workspace.baseCurrency} />

                <label>
                  Nome da carteira
                  <input defaultValue={accountInEdit.name} name="name" required />
                </label>

                <label>
                  Tipo de carteira
                  <select defaultValue={accountInEdit.type} name="type">
                    {accountTypeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Grupo financeiro
                  <select defaultValue={accountInEdit.accountGroup} name="accountGroup">
                    {accountGroupOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Saldo inicial
                  <input
                    defaultValue={accountInEdit.openingBalance}
                    name="openingBalance"
                    step="0.01"
                    type="number"
                  />
                </label>

                <label>
                  Moeda
                  <input defaultValue={accountInEdit.currency} maxLength={3} name="currency" />
                </label>

                <label>
                  Banco/provedor
                  <input
                    defaultValue={accountInEdit.openFinanceProvider ?? ""}
                    name="openFinanceProvider"
                  />
                </label>

                <label>
                  Conexão
                  <select defaultValue={accountInEdit.connectionMode} name="connectionMode">
                    {accountConnectionModeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Código de referência
                  <input
                    defaultValue={accountInEdit.externalAccountRef ?? ""}
                    name="externalAccountRef"
                  />
                </label>

                <label>
                  Cor da carteira
                  <select defaultValue={accountInEdit.color} name="color">
                    {accountColorOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Status Open Finance
                  <select defaultValue={accountInEdit.openFinanceStatus} name="openFinanceStatus">
                    {openFinanceStatusOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="wallet-checkbox-label">
                  <input defaultChecked={accountInEdit.isFavorite} name="isFavorite" type="checkbox" />
                  Mostrar como conta favorita na Home e nos resumos
                </label>

                <div className="wallet-modal-actions">
                  <button
                    className="ghost-button danger-button"
                    formAction={accountInEdit.isActive ? archiveAccount : restoreAccount}
                    type="submit"
                  >
                    {accountInEdit.isActive ? "Arquivar" : "Reativar"}
                  </button>
                  <button className="primary-button" type="submit">
                    Salvar
                  </button>
                </div>
              </form>
            ) : null}
          </article>
        </section>
      ) : null}
    </AppShell>
  );
}

function buildAccountTransactionSummary(
  transactions: Transaction[],
  selectedAccountId: string,
  locale: string,
  days: number,
  filters: MovementFilters
) {
  const now = new Date();
  const starts = Array.from({ length: days }, (_, index) => {
    const day = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - (days - 1 - index),
      12,
      0,
      0
    );
    return day;
  });
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const buckets = new Map<string, { income: number; expense: number }>();
  const filteredTransactions: typeof transactions = [];
  let postedIncome = 0;
  let postedExpenses = 0;

  for (const start of starts) {
    buckets.set(start.toISOString().slice(0, 10), { income: 0, expense: 0 });
  }

  for (const transaction of transactions) {
    const matchesAccount =
      selectedAccountId === "all" ||
      transaction.accountId === selectedAccountId ||
      transaction.transferAccountId === selectedAccountId;

    if (!matchesAccount || !matchesMovementFilters(transaction, filters)) {
      continue;
    }

    filteredTransactions.push(transaction);

    if (transaction.transferAccountId || transaction.status !== "posted") {
      continue;
    }

    const bucket = buckets.get(transaction.date);

    if (transaction.amount >= 0) {
      postedIncome += transaction.amount;
      if (bucket) {
        bucket.income += transaction.amount;
      }
    } else {
      const expense = Math.abs(transaction.amount);
      postedExpenses += expense;
      if (bucket) {
        bucket.expense += expense;
      }
    }
  }

  const dailyFlow = starts.map((start) => {
    const key = start.toISOString().slice(0, 10);
    const bucket = buckets.get(key) ?? { income: 0, expense: 0 };

    return {
      expense: bucket.expense,
      income: bucket.income,
      key,
      label: formatter.format(start)
    };
  });

  filteredTransactions.sort((a, b) => b.date.localeCompare(a.date));

  return {
    activityRows: filteredTransactions.slice(0, 10),
    dailyFlow,
    postedExpenses,
    postedIncome
  };
}

function buildAccountLedgerSummary(
  accounts: AccountWithBalance[],
  transactions: Transaction[],
  selectedAccountId: string,
  filters: MovementFilters
) {
  const scopedAccounts =
    selectedAccountId === "all"
      ? accounts
      : accounts.filter((account) => account.id === selectedAccountId);
  const scopedAccountIds = new Set(scopedAccounts.map((account) => account.id));
  const openingBalance = scopedAccounts.reduce((total, account) => total + account.openingBalance, 0);
  const currentBalance = scopedAccounts.reduce((total, account) => total + account.currentBalance, 0);
  let income = 0;
  let expenses = 0;
  let transfersIn = 0;
  let transfersOut = 0;
  let transactionCount = 0;
  let pendingCount = 0;
  let importedCount = 0;
  let reconciledCount = 0;

  for (const transaction of transactions) {
    const matchesAccount =
      selectedAccountId === "all" ||
      transaction.accountId === selectedAccountId ||
      transaction.transferAccountId === selectedAccountId;

    if (!matchesAccount || !matchesMovementFilters(transaction, filters)) {
      continue;
    }

    transactionCount += 1;

    if (transaction.reconciledAt) {
      reconciledCount += 1;
    }

    if (transaction.status === "pending") {
      pendingCount += 1;
    }

    if (transaction.source === "imported" || transaction.source === "openfinance") {
      importedCount += 1;
    }

    if (transaction.status !== "posted") {
      continue;
    }

    if (transaction.transferAccountId) {
      if (selectedAccountId === "all") {
        transfersIn += Math.abs(transaction.amount);
        transfersOut += Math.abs(transaction.amount);
      } else {
        const transferAmount = getTransactionAmountForAccount(transaction, selectedAccountId);
        if (transferAmount >= 0) {
          transfersIn += transferAmount;
        } else {
          transfersOut += Math.abs(transferAmount);
        }
      }
      continue;
    }

    if (selectedAccountId === "all" && !scopedAccountIds.has(transaction.accountId)) {
      continue;
    }

    if (transaction.amount >= 0) {
      income += transaction.amount;
    } else {
      expenses += Math.abs(transaction.amount);
    }
  }

  const transferVolume = transfersIn + transfersOut;
  const currentBalanceDescription =
    selectedAccountId === "all"
      ? "Saldo consolidado das contas ativas, sem duplicar transferências internas."
      : "Saldo calculado a partir do saldo inicial, lançamentos e transferências desta conta.";
  const reconciliationTitle =
    pendingCount > 0
      ? "Há movimentos pendentes"
      : transactionCount > reconciledCount
        ? "Há movimentos a conferir"
        : importedCount > 0
        ? "Pronta para conferir com o banco"
        : "Base manual sob controle";
  const reconciliationDescription =
    pendingCount > 0
      ? "Revise pendências antes de confiar em relatórios, orçamento ou previsão de caixa."
      : transactionCount > reconciledCount
        ? "Compare os movimentos com o extrato real e marque como conferido o que já bateu."
        : importedCount > 0
        ? "Compare os importados com o extrato real e ajuste duplicados se aparecerem."
        : "Sem pendências no filtro atual. Mantenha o hábito de conferir o saldo periodicamente.";

  return {
    currentBalance,
    currentBalanceDescription,
    expenses,
    importedCount,
    income,
    openingBalance,
    pendingCount,
    reconciledCount,
    reconciliationDescription,
    reconciliationTitle,
    transactionCount,
    transferVolume
  };
}

function calculateReconciledAccountBalance(
  account: AccountWithBalance,
  transactions: Transaction[]
) {
  return account.openingBalance + transactions.reduce((total, transaction) => {
    const matchesAccount =
      transaction.accountId === account.id || transaction.transferAccountId === account.id;

    if (!matchesAccount || transaction.status !== "posted" || !transaction.reconciledAt) {
      return total;
    }

    return total + getTransactionAmountForAccount(transaction, account.id);
  }, 0);
}

function formatMoneyInputValue(value: number) {
  return (Math.round(value * 100) / 100).toFixed(2);
}

function resolveAccountCreatePreset(kind?: string, connection?: string): AccountCreatePreset {
  if (connection === "openfinance" || kind === "openfinance") {
    return accountCreateChoices.find((choice) => choice.id === "openfinance") ?? accountCreateChoices[0];
  }

  if (kind === "cash") {
    return accountCreateChoices.find((choice) => choice.id === "cash") ?? accountCreateChoices[0];
  }

  const matchingChoice = accountCreateChoices.find((choice) => choice.id === kind);

  if (matchingChoice) {
    return matchingChoice;
  }

  return accountCreateChoices.find((choice) => choice.id === "manual-bank") ?? accountCreateChoices[0];
}

function resolveMovementStatus(value?: string): MovementStatusFilter {
  return movementStatusOptions.some((option) => option.id === value)
    ? (value as MovementStatusFilter)
    : "all";
}

function resolveMovementSource(value?: string): MovementSourceFilter {
  return movementSourceOptions.some((option) => option.id === value)
    ? (value as MovementSourceFilter)
    : "all";
}

function resolveMovementPeriod(value?: string): MovementPeriodFilter {
  return movementPeriodOptions.some((option) => option.id === value)
    ? (value as MovementPeriodFilter)
    : "90";
}

function buildAccountsHref({
  accountId,
  filters
}: {
  accountId: string;
  filters: MovementFilters;
}) {
  const params = new URLSearchParams();

  if (accountId !== "all") {
    params.set("accountId", accountId);
  }

  if (filters.period !== "90") {
    params.set("period", filters.period);
  }

  if (filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.source !== "all") {
    params.set("source", filters.source);
  }

  const query = params.toString();
  return query ? `/accounts?${query}` : "/accounts";
}

function matchesMovementFilters(transaction: Transaction, filters: MovementFilters) {
  if (filters.status !== "all" && transaction.status !== filters.status) {
    return false;
  }

  if (filters.source !== "all" && transaction.source !== filters.source) {
    return false;
  }

  if (filters.period === "all") {
    return true;
  }

  const days = Number(filters.period);
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days + 1);

  return new Date(`${transaction.date}T12:00:00`) >= cutoff;
}

function buildAccountGroupSummaries(accounts: AccountWithBalance[]) {
  const descriptions: Record<AccountGroup, string> = {
    daily_spending: "Contas usadas no cotidiano e que alimentam seu fluxo operacional.",
    short_term_savings: "Reservas e valores separados para compromissos dentro de um ano.",
    long_term_savings: "Patrimônio, investimentos e objetivos acima de um ano.",
    retirement: "Recursos destinados à independência financeira e aposentadoria.",
    debt: "Cartões, financiamentos, empréstimos e demais obrigações.",
    excluded: "Contas acompanhadas fora do orçamento principal."
  };

  return accountGroupOptions.map((option) => {
    const groupAccounts = accounts.filter((account) => account.accountGroup === option.id);
    const balance = groupAccounts.reduce((total, account) => total + account.currentBalance, 0);

    return {
      id: option.id,
      label: option.label,
      count: groupAccounts.length,
      balance,
      description: descriptions[option.id]
    };
  });
}

function buildCashflowChartGeometry(points: Array<{ income: number; expense: number }>) {
  const maxFlow = Math.max(1, ...points.flatMap((point) => [point.income, point.expense]));
  const minX = 46;
  const maxX = 874;
  const minY = 26;
  const maxY = 214;
  const baseY = maxY;
  const plotWidth = maxX - minX;
  const plotHeight = maxY - minY;

  const x = points.map((_, index) =>
    points.length <= 1 ? minX + plotWidth / 2 : minX + (index / (points.length - 1)) * plotWidth
  );
  const yIncome = points.map((point) => maxY - (point.income / maxFlow) * plotHeight);
  const yExpense = points.map((point) => maxY - (point.expense / maxFlow) * plotHeight);

  const incomeLine = x
    .map((value, index) => `${index === 0 ? "M" : "L"} ${value.toFixed(2)} ${yIncome[index].toFixed(2)}`)
    .join(" ");
  const expenseLine = x
    .map((value, index) => `${index === 0 ? "M" : "L"} ${value.toFixed(2)} ${yExpense[index].toFixed(2)}`)
    .join(" ");
  const incomeArea =
    points.length > 1
      ? `${incomeLine} L ${x[x.length - 1].toFixed(2)} ${baseY} L ${x[0].toFixed(2)} ${baseY} Z`
      : "";

  const gridLines = Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3;
    const value = maxFlow - maxFlow * ratio;
    const y = minY + ratio * plotHeight;
    return {
      label: `${index}-${value}`,
      y
    };
  });

  return {
    expenseLine,
    gridLines,
    incomeArea,
    incomeLine,
    x
  };
}
