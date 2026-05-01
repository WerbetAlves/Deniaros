import type { CurrencyCode, ForecastProjection, LocaleCode } from "@/lib/domain";
import { formatCurrency, formatShortDate } from "@/lib/finance";

export function ForecastCard({
  baseCurrency,
  locale,
  projection
}: {
  baseCurrency: CurrencyCode;
  locale: LocaleCode;
  projection: ForecastProjection;
}) {
  const { summary } = projection;
  const riskCopy = {
    attention: "Atenção ao caixa",
    danger: "Risco de aperto",
    stable: "Caixa previsto"
  }[summary.riskLevel];
  const nextEvents = projection.events.slice(0, 3);

  return (
    <section className="panel forecast-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Previsão de saldo</p>
          <h3>Projeção de caixa em 90 dias</h3>
        </div>
        <span className={`status-chip status-${summary.riskLevel}`}>{riskCopy}</span>
      </div>

      <div className="forecast-headline">
        <p className="mini-label">Menor saldo previsto</p>
        <strong>{formatCurrency(summary.lowestBalance, baseCurrency, locale)}</strong>
        <span>{formatShortDate(summary.lowestDate, locale)}</span>
      </div>

      <div className="forecast-rows">
        {projection.checkpoints.map((row) => (
          <div className="forecast-row" key={row.label}>
            <span>
              {row.label} - {formatShortDate(row.date, locale)}
            </span>
            <strong>{formatCurrency(row.balance, baseCurrency, locale)}</strong>
          </div>
        ))}
      </div>

      {nextEvents.length ? (
        <div className="forecast-event-list" aria-label="Próximos eventos da previsão">
          {nextEvents.map((event) => (
            <div className="forecast-event" key={event.id}>
              <span>{event.title}</span>
              <strong className={event.amount >= 0 ? "text-positive" : "text-negative"}>
                {formatCurrency(event.amount, event.currency, locale)}
              </strong>
              <small>
                {formatShortDate(event.date, locale)}
                {event.isOverdue ? " - vencido" : ""}
              </small>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
