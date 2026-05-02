import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import {
  buildForecastProjection,
  formatCurrency,
  formatShortDate,
  getAccountBalances,
  getOpenScheduledItems,
  getPostedExpenses,
  getPostedIncome,
  getTotalBalance
} from "@/lib/finance";
import { getFinancialData } from "@/lib/financial-data";
import type { Transaction } from "@/lib/domain";
import { getWorkspaceContext } from "@/lib/workspace-context";

type DecisionsSearchParams = {
  debtExtra?: string;
  expense?: string;
  reserveMonths?: string;
};

export default async function DecisionsPage({
  searchParams
}: {
  searchParams: Promise<DecisionsSearchParams>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const params = await searchParams;
  const { accounts, fallbackReason, scheduledItems, source, transactions, workspace } =
    await getFinancialData({ supabase, user, workspaceId });
  const accountBalances = getAccountBalances(accounts, transactions);
  const totalBalance = getTotalBalance(accountBalances);
  const openScheduledItems = getOpenScheduledItems(scheduledItems);
  const baseProjection = buildForecastProjection({
    currentBalance: totalBalance,
    scheduledItems,
    horizonDays: 90
  });
  const monthlyExpenses = calculateAverageMonthlyExpenses(transactions);
  const monthlyIncome = calculateAverageMonthlyIncome(transactions);
  const monthlyMargin = monthlyIncome - monthlyExpenses;
  const expenseAmount = normalizeMoneyInput(params.expense, 500);
  const debtExtra = normalizeMoneyInput(params.debtExtra, Math.max(100, Math.round(Math.max(0, monthlyMargin) * 0.25)));
  const reserveMonths = normalizeMonthsInput(params.reserveMonths, 1);
  const purchaseProjection = buildForecastProjection({
    currentBalance: totalBalance - expenseAmount,
    scheduledItems,
    horizonDays: 90
  });
  const debtExtraProjection = buildForecastProjection({
    currentBalance: totalBalance - debtExtra,
    scheduledItems,
    horizonDays: 90
  });
  const reserveTarget = monthlyExpenses * reserveMonths;
  const reserveGap = Math.max(0, reserveTarget - Math.max(0, totalBalance));
  const overdueItems = openScheduledItems.filter((item) => item.status === "overdue");
  const dueSoonItems = openScheduledItems
    .filter((item) => item.status === "due-soon")
    .slice(0, 4);
  const decisionTone = getDecisionTone(baseProjection.summary.riskLevel, reserveGap, monthlyMargin);

  return (
    <AppShell user={user} userEmail={user.email} workspaceId={workspace.id}>
      <section className="module-page decisions-page">
        <DataSourceBanner fallbackReason={fallbackReason} source={source} />
        <div className={`module-hero panel decisions-hero decisions-hero-${decisionTone}`}>
          <div>
            <p className="section-label">Centro de decisoes</p>
            <h2>Antes de agir, veja o impacto no futuro.</h2>
            <p className="supporting-copy">
              O Deniaros cruza saldo atual, agenda, margem mensal e risco de caixa para responder
              perguntas que normalmente viram chute: posso comprar, antecipar divida, segurar caixa
              ou reorganizar vencimentos?
            </p>
          </div>
          <div className="decision-score-card">
            <span>Leitura atual</span>
            <strong>{getDecisionHeadline(decisionTone)}</strong>
            <p>{getDecisionDescription(decisionTone, baseProjection.summary.firstNegativeDate, workspace.locale)}</p>
          </div>
        </div>

        <section className="panel decisions-lab">
          <div className="panel-header">
            <div>
              <p className="section-label">Simulador rapido</p>
              <h3>Teste a decisao antes de mexer no dinheiro</h3>
            </div>
            <span className="status-chip">90 dias</span>
          </div>

          <form className="decision-controls" method="get">
            <label>
              Compra ou gasto extra
              <input min="0" name="expense" step="50" type="number" defaultValue={expenseAmount} />
            </label>
            <label>
              Extra para dividas
              <input min="0" name="debtExtra" step="50" type="number" defaultValue={debtExtra} />
            </label>
            <label>
              Reserva desejada
              <select defaultValue={reserveMonths} name="reserveMonths">
                <option value="1">1 mes</option>
                <option value="3">3 meses</option>
                <option value="6">6 meses</option>
              </select>
            </label>
            <button className="primary-button" type="submit">
              Simular
            </button>
          </form>

          <div className="decision-simulator-grid">
            <DecisionScenarioCard
              actionHref="/transactions/new"
              actionLabel="Registrar decisao"
              currency={workspace.baseCurrency}
              description="Simula retirar este valor do caixa hoje e mede o menor saldo previsto."
              locale={workspace.locale}
              metricLabel="Menor saldo apos compra"
              metricValue={purchaseProjection.summary.lowestBalance}
              title="Posso fazer esse gasto?"
              tone={purchaseProjection.summary.riskLevel}
            />
            <DecisionScenarioCard
              actionHref="/planner?view=debts"
              actionLabel="Abrir plano de dividas"
              currency={workspace.baseCurrency}
              description="Mostra se existe folego para mandar dinheiro extra para quitação sem estourar o caixa."
              locale={workspace.locale}
              metricLabel="Caixa minimo com extra"
              metricValue={debtExtraProjection.summary.lowestBalance}
              title="Posso acelerar dividas?"
              tone={debtExtraProjection.summary.riskLevel}
            />
            <DecisionScenarioCard
              actionHref="/financial-agenda"
              actionLabel="Rever agenda"
              currency={workspace.baseCurrency}
              description={`${reserveMonths} mes(es) de despesas medias exigem uma reserva alvo calculada pelo seu historico.`}
              locale={workspace.locale}
              metricLabel={reserveGap > 0 ? "Falta para reserva" : "Reserva coberta"}
              metricValue={reserveGap}
              title="Minha reserva aguenta?"
              tone={reserveGap > Math.max(1, monthlyExpenses) ? "danger" : reserveGap > 0 ? "attention" : "stable"}
            />
          </div>
        </section>

        <div className="decisions-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Prioridade agora</p>
                <h3>O que merece sua atencao primeiro</h3>
              </div>
            </div>
            <div className="decision-priority-list">
              <DecisionPriority
                href="/financial-agenda"
                label="Agenda"
                status={overdueItems.length ? "danger" : dueSoonItems.length ? "attention" : "stable"}
                title={
                  overdueItems.length
                    ? `${overdueItems.length} compromisso(s) em atraso`
                    : dueSoonItems.length
                      ? `${dueSoonItems.length} compromisso(s) proximos`
                      : "Agenda sob controle"
                }
                description={
                  overdueItems.length
                    ? "Baixe, renegocie ou reagende antes de tomar novas decisoes."
                    : dueSoonItems.length
                      ? "Confira vencimentos antes de assumir nova compra ou pagamento extra."
                      : "Nenhum vencimento aberto pressiona a decisao imediata."
                }
              />
              <DecisionPriority
                href="/reports?section=habits&report=income-vs-expenses&period=90d"
                label="Margem"
                status={monthlyMargin < 0 ? "danger" : monthlyMargin < monthlyExpenses * 0.15 ? "attention" : "stable"}
                title={formatCurrency(monthlyMargin, workspace.baseCurrency, workspace.locale)}
                description="Margem media mensal calculada pelo historico recente. Ela define o quanto voce pode prometer ao futuro."
              />
              <DecisionPriority
                href="/reports?section=assets&report=account-balances"
                label="Patrimonio"
                status={baseProjection.summary.lowestBalance < 0 ? "danger" : "stable"}
                title={formatCurrency(baseProjection.summary.lowestBalance, workspace.baseCurrency, workspace.locale)}
                description={`Menor saldo projetado em ${formatShortDate(baseProjection.summary.lowestDate, workspace.locale)}.`}
              />
            </div>
          </section>

          <aside className="panel decisions-side-panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Metodo Deniaros</p>
                <h3>Decidir olhando passado e futuro</h3>
              </div>
            </div>
            <ol className="decision-method-list">
              <li>
                <strong>Passado</strong>
                <span>Historico recente revela sua margem real, nao a margem imaginada.</span>
              </li>
              <li>
                <strong>Presente</strong>
                <span>Agenda e saldo atual mostram o que ja esta comprometido.</span>
              </li>
              <li>
                <strong>Futuro</strong>
                <span>A previsao de caixa testa a decisao antes do dinheiro sair.</span>
              </li>
            </ol>
            <div className="form-actions planner-side-actions">
              <Link className="primary-button" href="/assistant">
                Conversar com o Consultor IA
              </Link>
              <Link className="ghost-button" href="/home-inventory">
                Abrir inventario
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}

function DecisionScenarioCard({
  actionHref,
  actionLabel,
  currency,
  description,
  locale,
  metricLabel,
  metricValue,
  title,
  tone
}: {
  actionHref: string;
  actionLabel: string;
  currency: string;
  description: string;
  locale: string;
  metricLabel: string;
  metricValue: number;
  title: string;
  tone: "stable" | "attention" | "danger";
}) {
  return (
    <article className={`decision-scenario-card decision-scenario-${tone}`}>
      <div>
        <span>{metricLabel}</span>
        <strong>{formatCurrency(metricValue, currency, locale)}</strong>
      </div>
      <h4>{title}</h4>
      <p>{description}</p>
      <Link href={actionHref}>{actionLabel}</Link>
    </article>
  );
}

function DecisionPriority({
  description,
  href,
  label,
  status,
  title
}: {
  description: string;
  href: string;
  label: string;
  status: "stable" | "attention" | "danger";
  title: string;
}) {
  return (
    <Link className={`decision-priority decision-priority-${status}`} href={href}>
      <span>{label}</span>
      <strong>{title}</strong>
      <p>{description}</p>
    </Link>
  );
}

function calculateAverageMonthlyExpenses(transactions: Transaction[]) {
  const recent = filterRecentTransactions(transactions, 90);
  const expenses = getPostedExpenses(recent);
  return expenses / 3;
}

function calculateAverageMonthlyIncome(transactions: Transaction[]) {
  const recent = filterRecentTransactions(transactions, 90);
  const income = getPostedIncome(recent);
  return income / 3;
}

function filterRecentTransactions<T extends { date: string }>(transactions: T[], days: number) {
  const start = new Date();
  start.setDate(start.getDate() - days);
  const startIso = start.toISOString().slice(0, 10);
  return transactions.filter((transaction) => transaction.date >= startIso);
}

function normalizeMoneyInput(value: string | undefined, fallback: number) {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
}

function normalizeMonthsInput(value: string | undefined, fallback: number) {
  const number = Number(value ?? fallback);
  return [1, 3, 6].includes(number) ? number : fallback;
}

function getDecisionTone(risk: "stable" | "attention" | "danger", reserveGap: number, monthlyMargin: number) {
  if (risk === "danger" || monthlyMargin < 0) {
    return "danger";
  }

  if (risk === "attention" || reserveGap > 0) {
    return "attention";
  }

  return "stable";
}

function getDecisionHeadline(tone: "stable" | "attention" | "danger") {
  if (tone === "danger") {
    return "Decida com cautela";
  }

  if (tone === "attention") {
    return "Existe margem, mas ela pede ordem";
  }

  return "Caminho livre com disciplina";
}

function getDecisionDescription(
  tone: "stable" | "attention" | "danger",
  firstNegativeDate: string | undefined,
  locale: string
) {
  if (tone === "danger") {
    return firstNegativeDate
      ? `Risco de saldo negativo em ${formatShortDate(firstNegativeDate, locale)}.`
      : "A margem recente esta apertada ou negativa.";
  }

  if (tone === "attention") {
    return "Simule antes de assumir novos compromissos.";
  }

  return "O caixa projetado suporta boas escolhas planejadas.";
}
