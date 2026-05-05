import { getFinancialData } from "@/lib/financial-data";
import {
  accountGroupOptions,
  mapWorkspaceAccount,
  type AccountGroup,
  type WorkspaceAccountRow
} from "@/lib/finance-admin";
import type { Transaction } from "@/lib/domain";
import {
  getAccountBalances,
  getTransactionAmountForAccount
} from "@/lib/finance";
import { getWorkspaceContext } from "@/lib/workspace-context";
import {
  AccountsWorkspace,
  accountCreateChoices,
  movementPeriodOptions,
  movementSourceOptions,
  movementStatusOptions,
  type AccountCreatePreset,
  type AccountGroupSummary,
  type AccountLedgerSummary,
  type AccountCashflowChartGeometry,
  type AccountReconciliationCheckRow,
  type AccountWithBalance,
  type MovementFilters,
  type MovementPeriodFilter,
  type MovementSourceFilter,
  type MovementStatusFilter
} from "@/components/accounts/accounts-workspace";

export default async function AccountsPage({
  searchParams
}: {
  searchParams: Promise<{
    accountId?: string;
    connection?: string;
    editId?: string;
    error?: string;
    first?: string;
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
  const { accountId, connection, editId, error, first, kind, mode, period, source, status, success } =
    await searchParams;
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
  const isFirstAccountFlow =
    first === "1" || (!activeAccounts.length && (isChooseMode || isCreateMode));
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
        "A conferencia de saldo ainda nao esta disponivel neste ambiente.";
    } else if (checkRowsError) {
      reconciliationCheckLoadError = checkRowsError.message;
    }

    if (reconciliationCheckLoadError?.toLowerCase().includes("migration")) {
      reconciliationCheckLoadError =
        "A conferencia de saldo ainda nao esta disponivel neste ambiente.";
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
    <AccountsWorkspace
      accountById={accountById}
      accountGroupSummaries={accountGroupSummaries}
      accountInEdit={accountInEdit}
      activeAccounts={activeAccounts}
      activityRows={activityRows}
      archivedAccounts={archivedAccounts}
      categoryById={categoryById}
      chart={chart}
      createPreset={createPreset}
      currentAccountsPath={currentAccountsPath}
      dailyFlow={dailyFlow}
      error={error}
      favoriteAccounts={favoriteAccounts}
      isFirstAccountFlow={isFirstAccountFlow}
      isChooseMode={isChooseMode}
      isCreateMode={isCreateMode}
      isFormOpen={isFormOpen}
      latestDifference={latestDifference}
      latestReconciliationCheck={latestReconciliationCheck}
      ledgerSummary={ledgerSummary}
      loadError={loadError?.message ?? null}
      movementFilters={movementFilters}
      netWorth={netWorth}
      payeeById={payeeById}
      postedExpenses={postedExpenses}
      postedIncome={postedIncome}
      reconciliationCheckLoadError={reconciliationCheckLoadError}
      reconciliationChecks={reconciliationChecks}
      selectedAccount={selectedAccount}
      selectedAccountId={selectedAccountId}
      selectedEditId={selectedEditId}
      selectedReconciledBalance={selectedReconciledBalance}
      success={success}
      totalBalance={totalBalance}
      userEmail={user.email}
      workspace={workspace}
    />
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
