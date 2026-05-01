import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import type { Account, Category, LocaleCode, ScheduledItem, Transaction } from "@/lib/domain";
import { getFinancialData } from "@/lib/financial-data";
import {
  categoryKindLabels,
  categoryKindOptions,
  scheduleKindLabels,
  scheduleStatusLabels
} from "@/lib/finance-admin";
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

type SectionId =
  | "habits"
  | "assets"
  | "debts"
  | "investments"
  | "taxes"
  | "monthly"
  | "favorites";
type ReportPeriod = "30d" | "90d" | "year" | "all" | "custom";

type ReportsSearchParams = {
  accountId?: string;
  categoryId?: string;
  from?: string;
  kind?: string;
  period?: string;
  report?: string;
  section?: string;
  to?: string;
};

type ReportItem = {
  id: string;
  section: SectionId;
  title: string;
  description: string;
};

const sectionLabels: Array<{ id: SectionId; label: string }> = [
  { id: "habits", label: "Hábitos de consumo" },
  { id: "assets", label: "O que eu tenho" },
  { id: "debts", label: "O que eu devo" },
  { id: "investments", label: "Investimentos" },
  { id: "taxes", label: "Impostos" },
  { id: "monthly", label: "Relatórios mensais" },
  { id: "favorites", label: "Meus favoritos" }
];

const baseReports: ReportItem[] = [
  {
    id: "where-money-goes",
    section: "habits",
    title: "Para onde vai o dinheiro",
    description: "Obtenha uma ideia geral de como você gasta seu dinheiro."
  },
  {
    id: "who-receives-money",
    section: "habits",
    title: "Quem está recebendo meu dinheiro",
    description: "Compare seus hábitos de consumo nos locais onde costuma comprar."
  },
  {
    id: "monthly-cashflow",
    section: "habits",
    title: "Fluxo de caixa mensal",
    description: "Veja mês a mês de onde veio seu dinheiro e para onde ele foi."
  },
  {
    id: "category-expenses",
    section: "habits",
    title: "Despesas da categoria",
    description: "Reveja todas as transações feitas para qualquer categoria em particular."
  },
  {
    id: "payee-expenses",
    section: "habits",
    title: "Despesas do favorecido",
    description: "Reveja os pagamentos de e para um favorecido específico."
  },
  {
    id: "account-transactions",
    section: "habits",
    title: "Transações da conta",
    description: "Veja qualquer subconjunto de todas as transações em qualquer uma de suas contas."
  },
  {
    id: "income-vs-expenses",
    section: "habits",
    title: "Rendimentos vs. despesas",
    description: "Verifique se está gastando mais do que recebendo."
  },
  {
    id: "my-budget",
    section: "habits",
    title: "Meu orçamento",
    description: "Reveja seus limites de despesas e objetivos de poupança."
  },
  {
    id: "budget-health",
    section: "habits",
    title: "Como anda o meu orçamento",
    description: "Descubra se você está vivendo de acordo com seu orçamento."
  },
  {
    id: "net-worth",
    section: "assets",
    title: "Patrimônio",
    description: "Compare o valor do que você possui com o que você deve."
  },
  {
    id: "net-worth-history",
    section: "assets",
    title: "Patrimônio ao longo do tempo",
    description: "Examine as tendências do seu patrimônio em um período específico de tempo."
  },
  {
    id: "account-balances",
    section: "assets",
    title: "Saldos das contas",
    description: "Veja como seu patrimônio é distribuído entre suas diferentes contas."
  },
  {
    id: "account-balance-history",
    section: "assets",
    title: "Histórico de saldos das contas",
    description: "Verifique como os saldos das contas selecionadas variam ao longo do tempo."
  },
  {
    id: "account-details",
    section: "assets",
    title: "Detalhes da conta",
    description: "Obtenha informações sobre todas as contas em um relatório único."
  },
  {
    id: "upcoming-bills",
    section: "debts",
    title: "Próximas contas a pagar",
    description: "Dê uma olhada em todas as suas despesas recorrentes."
  },
  {
    id: "monthly-bills-deposits",
    section: "debts",
    title: "Próximas contas a pagar e depósitos deste mês",
    description: "Veja com antecedência os depósitos e retiradas que ocorrerão este mês."
  },
  {
    id: "credit-card-debt",
    section: "debts",
    title: "Débito em cartão de crédito",
    description: "Descubra quanto você deve ou quanto possui em cada um de seus cartões de crédito."
  },
  {
    id: "loan-terms",
    section: "debts",
    title: "Condições dos empréstimos",
    description: "Reveja os detalhes de seus empréstimos atuais."
  },
  {
    id: "loan-amortization",
    section: "debts",
    title: "Amortização do empréstimo",
    description: "Veja quanto de seu empréstimo é realmente saldado com os pagamentos."
  },
  {
    id: "investment-performance",
    section: "investments",
    title: "Desempenho dos investimentos",
    description: "Acompanhe a evolução dos investimentos registrados no Deniaros."
  },
  {
    id: "investment-allocation",
    section: "investments",
    title: "Alocação de investimentos",
    description: "Veja como os investimentos estão distribuídos por conta e categoria."
  },
  {
    id: "tax-transactions",
    section: "taxes",
    title: "Transações relacionadas a impostos",
    description: "Junte todas as transações que irão ajudá-lo a preencher sua declaração de imposto de renda."
  },
  {
    id: "capital-gains",
    section: "taxes",
    title: "Ganhos de capital",
    description: "Determine o ganho ou perda líquidos das vendas de seus investimentos neste ano."
  },
  {
    id: "loan-interest",
    section: "taxes",
    title: "Juros do empréstimo",
    description: "Verifique os juros totais pagos a cada empréstimo em particular ao longo de um tempo específico."
  },
  {
    id: "tax-software",
    section: "taxes",
    title: "Relatório do software de imposto",
    description: "Prepare os dados de suas transações relacionadas com impostos para um programa de imposto."
  }
];

const reportPeriodOptions: Array<{ id: ReportPeriod; label: string }> = [
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "year", label: "Ano até hoje" },
  { id: "all", label: "Todo o histórico" },
  { id: "custom", label: "Personalizado" }
];
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

  return (
    <AppShell userEmail={user.email}>
      <section className="module-page reports-native-page">
        <DataSourceBanner fallbackReason={fallbackReason} source={source} />
        <div className="module-hero panel reports-native-hero">
          <div>
            <p className="section-label">Relatórios e gráficos</p>
            <h2>{selectedReport ? selectedReport.title : "Galeria de relatórios"}</h2>
            <p className="supporting-copy">
              Escolha uma família de relatório, abra uma visão específica e use os filtros para
              ajustar período, conta, categoria e fluxo. A lógica vem do Money99, mas a experiência
              agora é do Deniaros.
            </p>
          </div>
          <div className="profile-badges">
            <span className="status-chip">{sectionReports.length} nesta seção</span>
            <span className="status-chip">{operationalTransactions.length} lançamento(s)</span>
          </div>
        </div>

        <div className="money-report-page panel">
        <aside className="money-report-rail" aria-label="Seções de relatórios">
          <div className="money-report-rail-title">
            <strong>Relatórios</strong>
            <span>e Gráficos</span>
          </div>
          {sectionLabels.map((section) => (
            <Link
              className={section.id === selectedSection ? "active" : ""}
              href={`/reports?section=${section.id}`}
              key={section.id}
            >
              {section.label}
            </Link>
          ))}
        </aside>

        <div className="money-report-stage">
          <header className="money-report-titlebar">
            <h2>
              {selectedReport ? selectedReport.title : "Galeria de relatórios e gráficos"}
            </h2>
            {selectedReport ? (
              <Link href={`/reports?section=${selectedSection}`}>Voltar à galeria</Link>
            ) : null}
          </header>

          {selectedReport ? (
            <ReportDetail context={context} report={selectedReport} />
          ) : (
            <ReportGallery reports={sectionReports} section={selectedSection} />
          )}

          <form className="money-report-filterbar" method="get">
            <input name="section" type="hidden" value={selectedSection} />
            {selectedReport ? <input name="report" type="hidden" value={selectedReport.id} /> : null}
            <label>
              Int. de datas:
              <select defaultValue={selectedPeriod} name="period">
                {reportPeriodOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Conta:
              <select defaultValue={selectedAccountId} name="accountId">
                <option value="all">Todas as contas</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Categoria:
              <select defaultValue={selectedCategoryId} name="categoryId">
                <option value="all">Todas as categorias</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {categoryOptionLabels.get(category.id) ?? category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fluxo:
              <select defaultValue={selectedKind} name="kind">
                <option value="all">Todos</option>
                {categoryKindOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              De:
              <input defaultValue={range.fromInput} name="from" type="date" />
            </label>
            <label>
              Até:
              <input defaultValue={range.toInput} name="to" type="date" />
            </label>
            <button type="submit">Aplicar filtros</button>
          </form>

          <footer className="money-report-actionbar">
            {selectedReport ? (
              <Link href={`/reports?section=${selectedSection}`}>Voltar à galeria</Link>
            ) : sectionReports[0] ? (
              <Link href={buildReportHref(sectionReports[0], params)}>Abrir primeiro relatório</Link>
            ) : (
              <span>Nenhum relatório disponível</span>
            )}
            <Link href="/reports?section=favorites">Meus favoritos</Link>
          </footer>
        </div>
        </div>
      </section>
    </AppShell>
  );
}

function ReportGallery({ reports, section }: { reports: ReportItem[]; section: SectionId }) {
  const sectionLabel = sectionLabels.find((item) => item.id === section)?.label ?? "Relatórios";

  return (
    <section className="money-report-gallery">
      <div className="money-report-section-strip">{sectionLabel}</div>
      {reports.length ? (
        <div className="money-report-list">
          {reports.map((report, index) => (
            <Link
              className={index === 0 ? "selected" : ""}
              href={buildReportHref(report, {})}
              key={report.id}
            >
              <strong>{report.title}</strong>
              <span>{report.description}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="money-report-empty">
          <strong>Nenhum relatório favorito ainda.</strong>
          <span>Abra um relatório e personalize sua leitura antes de salvá-lo como favorito.</span>
        </div>
      )}
    </section>
  );
}

function ReportDetail({ context, report }: { context: ReportContext; report: ReportItem }) {
  return (
    <section className="money-report-detail">
      <div className="money-report-section-strip">{report.title}</div>
      <div className="money-report-explain">
        <strong>{report.title}</strong>
        <span>{report.description}</span>
      </div>
      {renderReportBody(report.id, context)}
    </section>
  );
}

function renderReportBody(reportId: string, context: ReportContext) {
  if (reportId === "where-money-goes" || reportId === "category-expenses") {
    return (
      <>
        <BarChart
          currency={context.currency}
          locale={context.locale}
          rows={context.rankedCategories
            .filter((entry) => entry.kind === "expense")
            .slice(0, 8)
            .map((entry) => ({ label: entry.categoryName, value: entry.total }))}
        />
        <ReportTable
          columns={["Categoria", "Lançamentos", "Total"]}
          rows={context.rankedCategories
            .filter((entry) => entry.kind === "expense")
            .slice(0, 10)
            .map((entry) => [
              entry.categoryName,
              String(entry.entries),
              formatCurrency(entry.total, context.currency, context.locale)
            ])}
        />
      </>
    );
  }

  if (reportId === "who-receives-money" || reportId === "payee-expenses") {
    return (
      <>
        <BarChart
          currency={context.currency}
          locale={context.locale}
          rows={context.rankedPayees
            .slice(0, 8)
            .map((entry) => ({ label: entry.payeeName, value: entry.expense || entry.total }))}
        />
        <ReportTable
          columns={["Favorecido", "Lançamentos", "Entradas", "Saídas", "Total"]}
          rows={context.rankedPayees.slice(0, 10).map((entry) => [
            entry.payeeName,
            String(entry.entries),
            formatCurrency(entry.income, context.currency, context.locale),
            formatCurrency(entry.expense, context.currency, context.locale),
            formatCurrency(entry.total, context.currency, context.locale)
          ])}
        />
      </>
    );
  }

  if (reportId === "monthly-cashflow" || reportId.startsWith("monthly-")) {
    return (
      <>
        <MonthlyFlowChart rows={context.monthlyRows} currency={context.currency} locale={context.locale} />
        <ReportTable
          columns={["Mês", "Entradas", "Saídas", "Resultado"]}
          rows={context.monthlyRows.map(([bucket, row]) => [
            formatMonthBucket(bucket, context.locale),
            formatCurrency(row.income, context.currency, context.locale),
            formatCurrency(row.expense, context.currency, context.locale),
            formatCurrency(row.income - row.expense, context.currency, context.locale)
          ])}
        />
      </>
    );
  }

  if (reportId === "income-vs-expenses" || reportId === "budget-health" || reportId === "my-budget") {
    return (
      <>
        <CompareChart
          currency={context.currency}
          expenses={context.postedExpenses}
          income={context.postedIncome}
          locale={context.locale}
        />
        <ReportTable
          columns={["Fluxo", "Realizado", "Agendado"]}
          rows={[
            [
              "Rendimentos",
              formatCurrency(context.postedIncome, context.currency, context.locale),
              formatCurrency(context.scheduledIncome, context.currency, context.locale)
            ],
            [
              "Despesas",
              formatCurrency(context.postedExpenses, context.currency, context.locale),
              formatCurrency(context.scheduledExpenses, context.currency, context.locale)
            ],
            [
              "Resultado",
              formatCurrency(context.postedIncome - context.postedExpenses, context.currency, context.locale),
              formatCurrency(context.scheduledIncome - context.scheduledExpenses, context.currency, context.locale)
            ]
          ]}
        />
      </>
    );
  }

  if (
    reportId === "net-worth" ||
    reportId === "net-worth-history" ||
    reportId === "account-balances" ||
    reportId === "account-balance-history" ||
    reportId === "account-details"
  ) {
    return (
      <>
        <BarChart
          currency={context.currency}
          locale={context.locale}
          rows={context.accountBalances.map((account) => ({
            label: account.name,
            value: account.currentBalance
          }))}
        />
        <ReportTable
          columns={["Conta", "Moeda", "Saldo"]}
          rows={[
            ...context.accountBalances.map((account) => [
              account.name,
              account.currency,
              formatCurrency(account.currentBalance, account.currency, context.locale)
            ]),
            ["Patrimônio consolidado", context.currency, formatCurrency(context.totalBalance, context.currency, context.locale)]
          ]}
        />
      </>
    );
  }

  if (
    reportId === "upcoming-bills" ||
    reportId === "monthly-bills-deposits" ||
    reportId === "credit-card-debt" ||
    reportId === "loan-terms" ||
    reportId === "loan-amortization"
  ) {
    return (
      <>
        <CompareChart
          currency={context.currency}
          expenses={context.scheduledExpenses}
          income={context.scheduledIncome}
          locale={context.locale}
        />
        <ReportTable
          columns={["Vencimento", "Compromisso", "Tipo", "Status", "Valor"]}
          rows={context.upcomingItems.map((item) => [
            formatShortDate(item.dueDate, context.locale),
            item.title,
            scheduleKindLabels[item.kind],
            scheduleStatusLabels[item.status],
            formatCurrency(item.amount, item.currency, context.locale)
          ])}
        />
      </>
    );
  }

  if (reportId === "account-transactions") {
    return (
      <ReportTable
        columns={["Data", "Descrição", "Categoria", "Valor"]}
        rows={context.operationalTransactions.slice(0, 18).map((transaction) => {
          const category = transaction.categoryId
            ? context.categoryById.get(transaction.categoryId)
            : undefined;
          return [
            formatShortDate(transaction.date, context.locale),
            transaction.description,
            category ? `${category.name} · ${categoryKindLabels[category.kind]}` : "Sem categoria",
            formatCurrency(transaction.amount, transaction.currency, context.locale)
          ];
        })}
      />
    );
  }

  if (reportId === "tax-transactions" || reportId === "capital-gains" || reportId === "loan-interest" || reportId === "tax-software") {
    return (
      <>
        <BarChart
          currency={context.currency}
          locale={context.locale}
          rows={context.rankedCategories.slice(0, 8).map((entry) => ({
            label: entry.categoryName,
            value: entry.total
          }))}
        />
        <ReportTable
          columns={["Categoria", "Tipo", "Total"]}
          rows={context.rankedCategories.slice(0, 12).map((entry) => [
            entry.categoryName,
            categoryKindLabels[entry.kind],
            formatCurrency(entry.total, context.currency, context.locale)
          ])}
        />
      </>
    );
  }

  return (
    <ReportTable
      columns={["Item", "Valor"]}
      rows={[
        ["Lançamentos no recorte", String(context.operationalTransactions.length)],
        ["Transferências", String(context.transferTransactions.length)],
        ["Saldo consolidado", formatCurrency(context.totalBalance, context.currency, context.locale)]
      ]}
    />
  );
}

function BarChart({
  currency,
  locale,
  rows
}: {
  currency: string;
  locale: LocaleCode;
  rows: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(...rows.map((row) => Math.abs(row.value)), 1);

  return (
    <div className="money-report-chart">
      {rows.length ? (
        rows.map((row) => (
          <div className="money-report-bar-row" key={row.label}>
            <span>{row.label}</span>
            <div>
              <i style={{ width: `${Math.max(5, (Math.abs(row.value) / max) * 100)}%` }} />
            </div>
            <strong>{formatCurrency(row.value, currency, locale)}</strong>
          </div>
        ))
      ) : (
        <p className="money-report-empty-note">Sem dados suficientes para desenhar o gráfico.</p>
      )}
    </div>
  );
}

function CompareChart({
  currency,
  expenses,
  income,
  locale
}: {
  currency: string;
  expenses: number;
  income: number;
  locale: LocaleCode;
}) {
  return (
    <BarChart
      currency={currency}
      locale={locale}
      rows={[
        { label: "Rendimentos", value: income },
        { label: "Despesas", value: expenses },
        { label: "Resultado", value: income - expenses }
      ]}
    />
  );
}

function MonthlyFlowChart({
  currency,
  locale,
  rows
}: {
  currency: string;
  locale: LocaleCode;
  rows: Array<[string, { income: number; expense: number }]>;
}) {
  return (
    <div className="money-report-month-chart">
      {rows.length ? (
        rows.map(([bucket, row]) => {
          const max = Math.max(row.income, row.expense, 1);
          return (
            <article key={bucket}>
              <strong>{formatMonthBucket(bucket, locale)}</strong>
              <div>
                <i style={{ height: `${Math.max(8, (row.income / max) * 100)}%` }} />
                <b style={{ height: `${Math.max(8, (row.expense / max) * 100)}%` }} />
              </div>
              <span>{formatCurrency(row.income - row.expense, currency, locale)}</span>
            </article>
          );
        })
      ) : (
        <p className="money-report-empty-note">Sem meses suficientes para comparar.</p>
      )}
    </div>
  );
}

function ReportTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="money-report-table-shell">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={`${row.join("-")}-${index}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>Sem dados suficientes para este relatório.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

type ReportContext = {
  accountBalances: ReturnType<typeof getAccountBalances>;
  accounts: Account[];
  categories: Category[];
  categoryById: Map<string, Category>;
  currency: string;
  filteredScheduledItems: ScheduledItem[];
  locale: LocaleCode;
  monthlyRows: Array<[string, { income: number; expense: number }]>;
  operationalTransactions: Transaction[];
  payeeById: Map<string, { name: string }>;
  postedExpenses: number;
  postedIncome: number;
  rankedCategories: Array<{
    categoryName: string;
    kind: "income" | "expense";
    total: number;
    entries: number;
  }>;
  rankedPayees: Array<{
    payeeName: string;
    total: number;
    entries: number;
    income: number;
    expense: number;
  }>;
  scheduledExpenses: number;
  scheduledIncome: number;
  selectedReport?: ReportItem;
  totalBalance: number;
  transferTransactions: Transaction[];
  upcomingItems: ScheduledItem[];
};

function buildReportHref(report: ReportItem, params: ReportsSearchParams) {
  const query = new URLSearchParams();
  query.set("section", report.section);
  query.set("report", report.id);

  for (const key of ["period", "accountId", "categoryId", "kind", "from", "to"] as const) {
    const value = params[key];
    if (value) {
      query.set(key, value);
    }
  }

  return `/reports?${query.toString()}`;
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

function formatMonthBucket(bucket: string, locale: LocaleCode) {
  return getMonthYearFormatter(locale).format(new Date(`${bucket}-01T12:00:00`));
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
