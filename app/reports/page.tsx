import { getFinancialData } from "@/lib/financial-data";
import type { Category, LocaleCode, ScheduledItem, Transaction } from "@/lib/domain";
import {
  formatCurrency,
  formatShortDate,
  getAccountBalances,
  getPostedExpenses,
  getPostedIncome,
  getScheduledExpenses,
  getScheduledIncome,
  getTotalBalance,
  getUpcomingItems
} from "@/lib/finance";
import { getWorkspaceContext } from "@/lib/workspace-context";
import {
  ReportsWorkspace,
  baseReports,
  reportPeriodOptions,
  sectionLabels,
  type ReportContext,
  type ReportInsight,
  type ReportItem,
  type ReportPeriod,
  type ReportsSearchParams,
  type SectionId
} from "@/components/reports/reports-workspace";

const monthYearFormatters = new Map<LocaleCode, Intl.DateTimeFormat>();

export default async function ReportsPage({
  searchParams
}: {
  searchParams: Promise<ReportsSearchParams>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const params = await searchParams;
  const { accounts, categories, fallbackReason, payees, scheduledItems, source, transactions, workspace } =
    await getFinancialData({ supabase, user, workspaceId });
  const monthlyReports = buildMonthlyReportItems(workspace.locale);
  const reports = [...baseReports, ...monthlyReports];
  const selectedReport = reports.find((report) => report.id === params.report);
  const selectedSection = selectedReport?.section ?? normalizeSection(params.section);
  const sectionReports = reports.filter((report) => report.section === selectedSection);
  const selectedPeriod = normalizeReportPeriod(params.period, selectedSection);
  const selectedKind = normalizeKindFilter(params.kind);
  const range = resolveDateRange(selectedPeriod, params.from, params.to, workspace.locale);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const payeeById = new Map(payees.map((payee) => [payee.id, payee]));
  const accountIds = new Set(accounts.map((account) => account.id));
  const selectedAccountId = params.accountId && accountIds.has(params.accountId) ? params.accountId : "all";
  const selectedCategoryId =
    params.categoryId && categoryById.has(params.categoryId) ? params.categoryId : "all";
  const accountScope = new Set(
    selectedAccountId === "all" ? accounts.map((account) => account.id) : [selectedAccountId]
  );
  const categoryFamilyIds =
    selectedCategoryId === "all" ? null : collectCategoryFamilyIds(categories, selectedCategoryId);
  const categoryOptionLabels = new Map(
    categories.map((category) => [category.id, buildCategoryLabel(category, categoryById)])
  );
  const { operationalTransactions, transferTransactions } = partitionReportTransactions({
    accountScope,
    categoryFamilyIds,
    range,
    selectedKind,
    transactions
  });
  const filteredScheduledItems = scheduledItems.filter(
    (item) =>
      accountScope.has(item.accountId) &&
      matchesDateScope(item.dueDate, range.startDate, range.endDate) &&
      matchesKindScope(item.amount, selectedKind) &&
      matchesCategoryScope(item.categoryId, categoryFamilyIds)
  );
  const visibleAccounts = accounts.filter((account) => accountScope.has(account.id));
  const accountBalances = getAccountBalances(visibleAccounts, transactions);
  const totalBalance = getTotalBalance(accountBalances);
  const postedIncome = getPostedIncome(operationalTransactions);
  const postedExpenses = getPostedExpenses(operationalTransactions);
  const scheduledIncome = getScheduledIncome(filteredScheduledItems);
  const scheduledExpenses = getScheduledExpenses(filteredScheduledItems);
  const rankedCategories = buildCategoryTotals(operationalTransactions, categoryById);
  const rankedPayees = buildPayeeTotals(operationalTransactions, payeeById);
  const monthlyRows = buildMonthlyRows(operationalTransactions).slice(0, 12);
  const upcomingItems = getUpcomingItems(filteredScheduledItems).slice(0, 12);
  const context: ReportContext = {
    accountBalances,
    accounts,
    categories,
    categoryById,
    currency: workspace.baseCurrency,
    filteredScheduledItems,
    locale: workspace.locale,
    monthlyRows,
    operationalTransactions,
    payeeById,
    postedExpenses,
    postedIncome,
    rankedCategories,
    rankedPayees,
    scheduledExpenses,
    scheduledIncome,
    selectedReport,
    totalBalance,
    transferTransactions,
    upcomingItems
  };
  const reportInsight = buildReportInsight({
    context,
    rangeLabel: range.label,
    report: selectedReport,
    section: selectedSection
  });

  return (
    <ReportsWorkspace
      accounts={accounts}
      categories={categories}
      categoryOptionLabels={categoryOptionLabels}
      context={context}
      fallbackReason={fallbackReason}
      operationalTransactionsCount={operationalTransactions.length}
      params={params}
      range={range}
      reportInsight={reportInsight}
      sectionReports={sectionReports}
      selectedAccountId={selectedAccountId}
      selectedCategoryId={selectedCategoryId}
      selectedKind={selectedKind}
      selectedPeriod={selectedPeriod}
      selectedReport={selectedReport}
      selectedSection={selectedSection}
      source={source}
      userEmail={user.email}
    />
  );
}

function buildReportInsight({
  context,
  rangeLabel,
  report,
  section
}: {
  context: ReportContext;
  rangeLabel: string;
  report?: ReportItem;
  section: SectionId;
}): ReportInsight {
  const net = context.postedIncome - context.postedExpenses;
  const topExpense = context.rankedCategories.find((entry) => entry.kind === "expense");
  const topPayee = context.rankedPayees[0];
  const nextItem = context.upcomingItems[0];
  const isNegative = net < 0;

  if (!report) {
    return {
      href: "/reports?section=habits&report=income-vs-expenses",
      metricLabel: "Resultado do recorte",
      metricValue: formatCurrency(net, context.currency, context.locale),
      nextAction: "Abra um relatorio pela pergunta que voce quer responder agora.",
      summary:
        "A galeria esta organizada por decisoes: consumo, patrimonio, dividas, impostos e meses fechados.",
      title: "Comece por uma pergunta, nao por uma tabela.",
      tone: isNegative ? "attention" : "stable"
    };
  }

  if (report.id === "where-money-goes" || report.id === "category-expenses") {
    return {
      href: "/decisions",
      metricLabel: topExpense ? "Maior saida" : "Despesas",
      metricValue: topExpense
        ? formatCurrency(topExpense.total, context.currency, context.locale)
        : formatCurrency(context.postedExpenses, context.currency, context.locale),
      nextAction: topExpense
        ? `Simule reduzir ${topExpense.categoryName} antes de cortar no escuro.`
        : "Classifique movimentos para descobrir os vazamentos reais.",
      summary: topExpense
        ? `${topExpense.categoryName} concentra a maior pressao do recorte ${rangeLabel}.`
        : "Ainda nao ha categorias suficientes para apontar um vazamento confiavel.",
      title: "Seu historico mostra onde atacar primeiro.",
      tone: topExpense ? "attention" : "stable"
    };
  }

  if (report.id === "who-receives-money" || report.id === "payee-expenses") {
    return {
      href: "/payees",
      metricLabel: topPayee ? "Favorecido lider" : "Favorecidos",
      metricValue: topPayee
        ? formatCurrency(topPayee.total, context.currency, context.locale)
        : String(context.rankedPayees.length),
      nextAction: topPayee
        ? `Revise recorrencia, categoria e necessidade de ${topPayee.payeeName}.`
        : "Cadastre favorecidos para transformar movimentos soltos em padrao.",
      summary: topPayee
        ? `${topPayee.payeeName} aparece como maior concentracao de movimento no recorte.`
        : "Sem favorecidos suficientes para identificar concentracao de pagamentos.",
      title: "O dinheiro tambem conta uma historia por destino.",
      tone: topPayee && topPayee.expense > topPayee.income ? "attention" : "stable"
    };
  }

  if (report.id === "income-vs-expenses" || report.id === "budget-health" || report.id === "my-budget") {
    return {
      href: isNegative ? "/decisions" : "/planner?view=budget",
      metricLabel: "Resultado",
      metricValue: formatCurrency(net, context.currency, context.locale),
      nextAction: isNegative
        ? "Use o Centro de Decisoes para testar cortes e reorganizar vencimentos."
        : "Transforme a sobra em reserva, meta ou pagamento antecipado.",
      summary: isNegative
        ? "As despesas superaram as entradas no recorte. O relatorio virou alerta de decisao."
        : "As entradas cobrem as saidas no recorte. Agora a pergunta e como usar melhor a margem.",
      title: isNegative ? "Seu mes pede intervencao." : "Existe margem para planejar.",
      tone: isNegative ? "danger" : "stable"
    };
  }

  if (section === "debts") {
    return {
      href: "/financial-agenda",
      metricLabel: "Compromissos",
      metricValue: formatCurrency(context.scheduledExpenses, context.currency, context.locale),
      nextAction: nextItem
        ? `Revise ${nextItem.title} antes de ${formatShortDate(nextItem.dueDate, context.locale)}.`
        : "Cadastre vencimentos para o Deniaros prever seu caixa.",
      summary: nextItem
        ? `O proximo compromisso e ${nextItem.title}. A agenda deve antecipar o aperto, nao so registrar atraso.`
        : "Sem compromissos abertos no recorte. A previsao fica mais forte quando contas e depositos entram na agenda.",
      title: "Divida boa de vencer e divida vista antes.",
      tone: context.scheduledExpenses > context.scheduledIncome ? "attention" : "stable"
    };
  }

  if (section === "assets") {
    return {
      href: "/accounts",
      metricLabel: "Patrimonio",
      metricValue: formatCurrency(context.totalBalance, context.currency, context.locale),
      nextAction: "Revise carteiras sem movimento e saldos que nao refletem a vida real.",
      summary: "Patrimonio so ajuda a decidir quando contas, ativos e passivos estao no mesmo mapa.",
      title: "Sua posicao consolidada precisa ser confiavel.",
      tone: context.totalBalance < 0 ? "danger" : "stable"
    };
  }

  if (section === "taxes") {
    return {
      href: "/tax-categories",
      metricLabel: "Categorias no recorte",
      metricValue: String(context.rankedCategories.length),
      nextAction: "Revise categorias fiscais antes do fechamento do ano.",
      summary: "Imposto fica mais leve quando a classificacao acontece durante o ano, nao na pressa.",
      title: "Organizacao fiscal e rotina, nao evento.",
      tone: "attention"
    };
  }

  if (section === "monthly") {
    const currentMonth = context.monthlyRows[0]?.[1];
    const monthlyNet = currentMonth ? currentMonth.income - currentMonth.expense : net;

    return {
      href: "/assistant?question=Me%20explique%20meu%20relatorio%20mensal",
      metricLabel: "Resultado mensal",
      metricValue: formatCurrency(monthlyNet, context.currency, context.locale),
      nextAction: "Peca ao Consultor IA para transformar o fechamento em proximas decisoes.",
      summary: "O relatorio mensal deve fechar o ciclo: o que aconteceu, por que aconteceu e o que mudar.",
      title: monthlyNet < 0 ? "O mes fechou pedindo ajuste." : "O mes deixou uma leitura util.",
      tone: monthlyNet < 0 ? "attention" : "stable"
    };
  }

  return {
    href: "/reports",
    metricLabel: "Lancamentos",
    metricValue: String(context.operationalTransactions.length),
    nextAction: "Use os filtros para chegar na pergunta certa antes de exportar qualquer dado.",
    summary: "Este relatorio esta pronto para leitura, filtro e comparacao.",
    title: "Transforme detalhe em decisao.",
    tone: "stable"
  };
}


function buildMonthlyReportItems(locale: LocaleCode): ReportItem[] {
  const now = new Date();
  const formatter = getMonthYearFormatter(locale);

  return Array.from({ length: 13 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1, 12, 0, 0);
    const label = formatter.format(date);
    const normalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);

    return {
      id: `monthly-${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`,
      section: "monthly" as const,
      title: `Relatório de ${normalizedLabel}${index === 0 ? " (em andamento)" : ""}`,
      description: "Resumo mensal com rendimentos, despesas e movimentos do período."
    };
  });
}

function buildCategoryTotals(
  transactions: Transaction[],
  categoryById: Map<string, Category>
) {
  const categoryTotals = new Map<
    string,
    {
      categoryName: string;
      kind: "income" | "expense";
      total: number;
      entries: number;
    }
  >();

  for (const transaction of transactions) {
    if (!transaction.categoryId) {
      continue;
    }

    const category = categoryById.get(transaction.categoryId);
    if (!category) {
      continue;
    }

    const rootCategory = category.parentId
      ? categoryById.get(category.parentId) ?? category
      : category;
    const existing = categoryTotals.get(rootCategory.id) ?? {
      categoryName: rootCategory.name,
      kind: rootCategory.kind,
      total: 0,
      entries: 0
    };

    existing.total += Math.abs(transaction.amount);
    existing.entries += 1;
    categoryTotals.set(rootCategory.id, existing);
  }

  return [...categoryTotals.values()].sort((left, right) => right.total - left.total);
}

function partitionReportTransactions({
  accountScope,
  categoryFamilyIds,
  range,
  selectedKind,
  transactions
}: {
  accountScope: Set<string>;
  categoryFamilyIds: Set<string> | null;
  range: { endDate: string | null; startDate: string | null };
  selectedKind: "all" | "expense" | "income";
  transactions: Transaction[];
}) {
  const operationalTransactions: Transaction[] = [];
  const transferTransactions: Transaction[] = [];

  for (const transaction of transactions) {
    if (
      transaction.status !== "posted" ||
      !matchesAccountScope(transaction, accountScope) ||
      !matchesDateScope(transaction.date, range.startDate, range.endDate)
    ) {
      continue;
    }

    if (transaction.transferAccountId) {
      transferTransactions.push(transaction);
      continue;
    }

    if (
      matchesKindScope(transaction.amount, selectedKind) &&
      matchesCategoryScope(transaction.categoryId, categoryFamilyIds)
    ) {
      operationalTransactions.push(transaction);
    }
  }

  return { operationalTransactions, transferTransactions };
}

function buildPayeeTotals(transactions: Transaction[], payeeById: Map<string, { name: string }>) {
  const payeeTotals = new Map<
    string,
    {
      payeeName: string;
      total: number;
      entries: number;
      income: number;
      expense: number;
    }
  >();

  for (const transaction of transactions) {
    if (!transaction.payeeId) {
      continue;
    }

    const payee = payeeById.get(transaction.payeeId);
    if (!payee) {
      continue;
    }

    const existing = payeeTotals.get(transaction.payeeId) ?? {
      payeeName: payee.name,
      total: 0,
      entries: 0,
      income: 0,
      expense: 0
    };

    existing.total += Math.abs(transaction.amount);
    existing.entries += 1;

    if (transaction.amount >= 0) {
      existing.income += transaction.amount;
    } else {
      existing.expense += Math.abs(transaction.amount);
    }

    payeeTotals.set(transaction.payeeId, existing);
  }

  return [...payeeTotals.values()].sort((left, right) => right.total - left.total);
}

function buildMonthlyRows(transactions: Transaction[]) {
  const monthlyLedger = new Map<string, { income: number; expense: number }>();

  for (const transaction of transactions) {
    const bucket = transaction.date.slice(0, 7);
    const currentMonth = monthlyLedger.get(bucket) ?? { income: 0, expense: 0 };

    if (transaction.amount >= 0) {
      currentMonth.income += transaction.amount;
    } else {
      currentMonth.expense += Math.abs(transaction.amount);
    }

    monthlyLedger.set(bucket, currentMonth);
  }

  return [...monthlyLedger.entries()].sort((left, right) => right[0].localeCompare(left[0]));
}

function normalizeSection(value?: string): SectionId {
  return sectionLabels.some((section) => section.id === value) ? (value as SectionId) : "habits";
}

function normalizeReportPeriod(value: string | undefined, section: SectionId): ReportPeriod {
  if (reportPeriodOptions.some((option) => option.id === value)) {
    return value as ReportPeriod;
  }

  return section === "taxes" ? "year" : "30d";
}

function normalizeKindFilter(value?: string) {
  if (value === "income" || value === "expense") {
    return value;
  }

  return "all";
}

function normalizeDateInput(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function resolveDateRange(
  period: ReportPeriod,
  fromRaw: string | undefined,
  toRaw: string | undefined,
  locale: LocaleCode
) {
  const today = createLocalDate();
  const toInput = normalizeDateInput(toRaw);
  const fromInput = normalizeDateInput(fromRaw);

  if (period === "all") {
    return { startDate: null, endDate: null, fromInput: "", label: "Todo o histórico", toInput: "" };
  }

  if (period === "custom") {
    let startDate = fromInput || null;
    let endDate = toInput || null;

    if (startDate && endDate && startDate > endDate) {
      [startDate, endDate] = [endDate, startDate];
    }

    return {
      startDate,
      endDate,
      fromInput: startDate ?? "",
      label: startDate || endDate ? `${startDate ?? "início"} a ${endDate ?? "hoje"}` : "Personalizado",
      toInput: endDate ?? ""
    };
  }

  if (period === "year") {
    return {
      startDate: `${today.getFullYear()}-01-01`,
      endDate: toIsoDate(today),
      fromInput: "",
      label: "Ano até hoje",
      toInput: ""
    };
  }

  const days = period === "30d" ? 29 : 89;
  const start = new Date(today);
  start.setDate(today.getDate() - days);

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(today),
    fromInput: "",
    label: reportPeriodOptions.find((option) => option.id === period)?.label ?? "Recorte",
    toInput: ""
  };
}

function collectCategoryFamilyIds(categories: Category[], categoryId: string) {
  const familyIds = new Set([categoryId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const category of categories) {
      if (category.parentId && familyIds.has(category.parentId) && !familyIds.has(category.id)) {
        familyIds.add(category.id);
        changed = true;
      }
    }
  }

  return familyIds;
}

function buildCategoryLabel(category: Category, categoryById: Map<string, Category>) {
  if (!category.parentId) {
    return category.name;
  }

  const parent = categoryById.get(category.parentId);
  return parent ? `${parent.name} / ${category.name}` : category.name;
}

function matchesAccountScope(transaction: Transaction, accountScope: Set<string>) {
  return (
    accountScope.has(transaction.accountId) ||
    (transaction.transferAccountId ? accountScope.has(transaction.transferAccountId) : false)
  );
}

function matchesDateScope(isoDate: string, startDate: string | null, endDate: string | null) {
  if (startDate && isoDate < startDate) {
    return false;
  }

  if (endDate && isoDate > endDate) {
    return false;
  }

  return true;
}

function matchesKindScope(amount: number, kind: "all" | "income" | "expense") {
  if (kind === "all") {
    return true;
  }

  return kind === "income" ? amount > 0 : amount < 0;
}

function matchesCategoryScope(categoryId: string | undefined, categoryFamilyIds: Set<string> | null) {
  if (!categoryFamilyIds) {
    return true;
  }

  return categoryId ? categoryFamilyIds.has(categoryId) : false;
}

function createLocalDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
}

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}


function getMonthYearFormatter(locale: LocaleCode) {
  let formatter = monthYearFormatters.get(locale);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric"
    });
    monthYearFormatters.set(locale, formatter);
  }

  return formatter;
}
