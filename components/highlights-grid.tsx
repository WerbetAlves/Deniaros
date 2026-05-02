import { formatCurrency } from "@/lib/finance";
import type { CurrencyCode, LocaleCode } from "@/lib/domain";
import { MetricValue, WidgetWrapper } from "@/components/widget-wrapper";

type HighlightsGridProps = {
  dashboard: {
    baseCurrency: CurrencyCode;
    locale: LocaleCode;
    accountCount: number;
    transactionCount: number;
    scheduledCount: number;
    postedIncome: number;
    postedExpenses: number;
    scheduledIncome: number;
  };
};

export function HighlightsGrid({ dashboard }: HighlightsGridProps) {
  const cards = [
    {
      label: "Contas ativas",
      value: String(dashboard.accountCount),
      text: "Corrente, carteira, negócio e reserva."
    },
    {
      label: "Lançamentos",
      value: String(dashboard.transactionCount),
      text: `${formatCurrency(
        dashboard.postedIncome,
        dashboard.baseCurrency,
        dashboard.locale
      )} em entradas e ${formatCurrency(
        dashboard.postedExpenses,
        dashboard.baseCurrency,
        dashboard.locale
      )} em saídas.`
    },
    {
      label: "Agenda",
      value: String(dashboard.scheduledCount),
      text: `${formatCurrency(
        dashboard.scheduledIncome,
        dashboard.baseCurrency,
        dashboard.locale
      )} em depósitos previstos.`
    }
  ];

  return (
    <section className="highlights-grid">
      {cards.map((card) => (
        <WidgetWrapper className="highlight-metric-card" key={card.label} label={card.label} tooltip={card.text}>
          <MetricValue>{card.value}</MetricValue>
        </WidgetWrapper>
      ))}
    </section>
  );
}
