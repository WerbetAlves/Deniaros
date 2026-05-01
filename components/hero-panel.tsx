import Link from "next/link";
import type { CurrencyCode, ForecastProjection, LocaleCode } from "@/lib/domain";
import { formatCurrency, formatShortDate } from "@/lib/finance";

type HeroPanelProps = {
  dashboard: {
    totalBalance: number;
    baseCurrency: CurrencyCode;
    locale: LocaleCode;
    scheduledExpenses: number;
    scheduledIncome: number;
    scheduledCount: number;
  };
  projection: ForecastProjection;
};

export function HeroPanel({ dashboard, projection }: HeroPanelProps) {
  const nextWeekBalance = projection.checkpoints.find((point) => point.label === "Em 7 dias");
  const forecastBalance = nextWeekBalance?.balance ?? dashboard.totalBalance;
  const { summary } = projection;
  const nextEvent = projection.events[0];
  const decisionTone = summary.riskLevel;
  const decisionTitle =
    summary.riskLevel === "danger"
      ? "Ajuste o caixa antes do próximo vencimento."
      : summary.riskLevel === "attention"
        ? "Revise os compromissos do período."
        : "Seu caixa previsto está sob controle.";
  const decisionCopy =
    summary.riskLevel === "danger"
      ? `A projeção pode chegar a ${formatCurrency(
          summary.lowestBalance,
          dashboard.baseCurrency,
          dashboard.locale
        )} em ${formatShortDate(summary.lowestDate, dashboard.locale)}.`
      : nextEvent
        ? `Próximo evento: ${nextEvent.title}, ${formatCurrency(
            nextEvent.amount,
            nextEvent.currency,
            dashboard.locale
          )} em ${formatShortDate(nextEvent.date, dashboard.locale)}.`
        : `Você tem ${dashboard.scheduledCount} compromisso${
            dashboard.scheduledCount === 1 ? "" : "s"
          } em aberto na agenda.`;

  return (
    <section className="hero-panel command-center">
      <div className="command-center-primary">
        <p className="section-label">Centro de comando</p>
        <h3>
          {formatCurrency(
            dashboard.totalBalance,
            dashboard.baseCurrency,
            dashboard.locale
          )}
        </h3>
        <p className="supporting-copy">
          Saldo consolidado agora, previsão de caixa e compromissos financeiros no
          mesmo ponto de decisão.
        </p>

        <div className="hero-actions">
          <Link className="primary-button" href="/transactions/new">
            Novo movimento
          </Link>
          <Link className="ghost-button" href="/financial-agenda">
            Ver agenda
          </Link>
        </div>
      </div>

      <div className={`command-decision command-decision-${decisionTone}`}>
        <p className="mini-label">Próxima melhor ação</p>
        <strong>{decisionTitle}</strong>
        <p>{decisionCopy}</p>
      </div>

      <div className="hero-metrics">
        <article className="metric-inline">
          <p className="mini-label">Saldo em 7 dias</p>
          <strong>
            {formatCurrency(forecastBalance, dashboard.baseCurrency, dashboard.locale)}
          </strong>
          <p>Inclui contas, depósitos e reservas agendadas.</p>
        </article>
        <article className="metric-inline">
          <p className="mini-label">Menor saldo em 90 dias</p>
          <strong>
            {formatCurrency(summary.lowestBalance, dashboard.baseCurrency, dashboard.locale)}
          </strong>
          <p>{formatShortDate(summary.lowestDate, dashboard.locale)} é o ponto mais sensível.</p>
        </article>
        <article className="metric-inline">
          <p className="mini-label">Entradas menos saídas</p>
          <strong>
            {formatCurrency(summary.netScheduled, dashboard.baseCurrency, dashboard.locale)}
          </strong>
          <p>{summary.eventCount} evento{summary.eventCount === 1 ? "" : "s"} no horizonte.</p>
        </article>
      </div>
    </section>
  );
}
