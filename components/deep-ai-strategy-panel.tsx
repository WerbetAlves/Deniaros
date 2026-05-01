import Link from "next/link";
import type { CurrencyCode, ForecastProjection, LocaleCode } from "@/lib/domain";
import { formatCurrency, formatShortDate } from "@/lib/finance";

export function DeepAiStrategyPanel({
  baseCurrency,
  hasGeminiKey,
  locale,
  projection,
  scheduledExpenses
}: {
  baseCurrency: CurrencyCode;
  hasGeminiKey: boolean;
  locale: LocaleCode;
  projection: ForecastProjection;
  scheduledExpenses: number;
}) {
  const { summary } = projection;
  const insight =
    summary.riskLevel === "danger"
      ? `A IA deve priorizar alternativas para cobrir ${formatCurrency(
          Math.abs(summary.lowestBalance),
          baseCurrency,
          locale
        )} até ${formatShortDate(summary.lowestDate, locale)}.`
      : summary.riskLevel === "attention"
        ? `A IA pode revisar ${formatCurrency(
            scheduledExpenses,
            baseCurrency,
            locale
          )} em compromissos e reduzir a pressão do período.`
        : `A IA pode procurar economia fina e padrões recorrentes nos próximos ${summary.horizonDays} dias.`;

  return (
    <section className="panel deep-ai-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">IA consultiva</p>
          <h3>Decisão explicada, não chute automático</h3>
          <p className="micro-copy">{insight}</p>
        </div>
        <span className="status-chip">{hasGeminiKey ? "Gemini ativo" : "Gemini pendente"}</span>
      </div>

      <p className="supporting-copy">
        O papel da IA aqui é cruzar saldo, agenda, categorias e rotina para sugerir ações com trilha
        clara. O usuário decide, o sistema explica.
      </p>

      <div className="form-actions planner-side-actions">
        <Link className="primary-button" href="/assistant">
          Conversar com a IA
        </Link>
        <Link className="ghost-button" href="/planner">
          Ver planejador
        </Link>
      </div>
    </section>
  );
}
