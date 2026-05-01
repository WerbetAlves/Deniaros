import { formatCurrency } from "@/lib/finance";
import type { CurrencyCode, LocaleCode } from "@/lib/domain";

export function FinancialHealthPanel({
  baseCurrency,
  locale,
  postedExpenses,
  postedIncome,
  scheduledExpenses,
  totalBalance
}: {
  postedIncome: number;
  postedExpenses: number;
  scheduledExpenses: number;
  totalBalance: number;
  baseCurrency: CurrencyCode;
  locale: LocaleCode;
}) {
  const healthScore = computeFinancialHealth({
    postedIncome,
    postedExpenses,
    scheduledExpenses,
    totalBalance
  });

  return (
    <section className="panel health-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Minha Saúde Financeira</p>
          <h3>Indicador atual de estabilidade</h3>
        </div>
        <span className="status-chip">{healthScore}%</span>
      </div>

      <div className="health-liquid-track" role="img" aria-label={`Saúde financeira em ${healthScore}%`}>
        <div className="health-liquid-fill" style={{ width: `${healthScore}%` }} />
      </div>

      <p className="supporting-copy">
        Saldo atual: {formatCurrency(totalBalance, baseCurrency, locale)}. Pressao de curto prazo:
        {" "}
        {formatCurrency(scheduledExpenses, baseCurrency, locale)}.
      </p>
    </section>
  );
}

function computeFinancialHealth({
  postedIncome,
  postedExpenses,
  scheduledExpenses,
  totalBalance
}: {
  postedIncome: number;
  postedExpenses: number;
  scheduledExpenses: number;
  totalBalance: number;
}) {
  const safeIncome = Math.max(1, postedIncome);
  const expensePressure = postedExpenses / safeIncome;
  const upcomingPressure = scheduledExpenses / Math.max(1, postedIncome + Math.max(totalBalance, 0));
  const reserveFactor = Math.min(1.6, totalBalance / Math.max(1, postedExpenses));

  const rawScore = 55 + reserveFactor * 18 - expensePressure * 22 - upcomingPressure * 18;
  return Math.max(1, Math.min(100, Math.round(rawScore)));
}
