import Link from "next/link";
import type {
  Category,
  CurrencyCode,
  ForecastProjection,
  LocaleCode,
  Payee,
  Transaction
} from "@/lib/domain";
import { formatCurrency, formatShortDate, isPostedTransaction } from "@/lib/finance";

type FinancialTrajectoryPanelProps = {
  baseCurrency: CurrencyCode;
  categories: Category[];
  locale: LocaleCode;
  payees: Payee[];
  projection: ForecastProjection;
  transactions: Transaction[];
};

type RankedItem = {
  id: string;
  label: string;
  value: number;
};

export function FinancialTrajectoryPanel({
  baseCurrency,
  categories,
  locale,
  payees,
  projection,
  transactions
}: FinancialTrajectoryPanelProps) {
  const analysis = buildTrajectoryAnalysis({
    categories,
    payees,
    projection,
    transactions
  });
  const { summary } = projection;
  const riskCopy = {
    attention: "Ajuste fino recomendado",
    danger: "Intervenção necessária",
    stable: "Rota controlada"
  }[summary.riskLevel];
  const futureCopy =
    summary.riskLevel === "danger"
      ? `O caixa pode tocar ${formatCurrency(summary.lowestBalance, baseCurrency, locale)} em ${formatShortDate(
          summary.lowestDate,
          locale
        )}.`
      : summary.riskLevel === "attention"
        ? `O ponto mais sensível aparece em ${formatShortDate(summary.lowestDate, locale)}, com ${formatCurrency(
            summary.lowestBalance,
            baseCurrency,
            locale
          )}.`
        : `Mantendo a rota atual, o menor saldo previsto é ${formatCurrency(
            summary.lowestBalance,
            baseCurrency,
            locale
          )}.`;

  return (
    <section className="panel financial-trajectory-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Passado para projetar futuro</p>
          <h3>Sua trajetória financeira</h3>
          <p className="micro-copy">
            O Deniaros cruza hábitos recentes, compromissos já assumidos e previsão de caixa
            para transformar registro em decisão.
          </p>
        </div>
        <span className={`status-chip status-${summary.riskLevel}`}>{riskCopy}</span>
      </div>

      <div className="trajectory-timeline" aria-label="Leitura financeira do passado ao futuro">
        <article>
          <span className="trajectory-node">1</span>
          <p className="mini-label">Passado recente</p>
          <strong>
            {formatCurrency(analysis.currentPeriodExpenses, baseCurrency, locale)}
          </strong>
          <p>
            Saídas nos últimos 30 dias. {analysis.expenseDeltaCopy}
          </p>
        </article>

        <article>
          <span className="trajectory-node">2</span>
          <p className="mini-label">Padrão detectado</p>
          <strong>{analysis.topExpense?.label ?? "Sem padrão dominante"}</strong>
          <p>
            {analysis.topExpense
              ? `${formatCurrency(
                  analysis.topExpense.value,
                  baseCurrency,
                  locale
                )} concentrados nessa frente.`
              : "Ainda falta histórico para apontar concentração real."}
          </p>
        </article>

        <article>
          <span className="trajectory-node">3</span>
          <p className="mini-label">Futuro provável</p>
          <strong>{formatCurrency(summary.endingBalance, baseCurrency, locale)}</strong>
          <p>{futureCopy}</p>
        </article>
      </div>

      <div className="trajectory-action-grid">
        <article className="trajectory-insight-card">
          <p className="mini-label">Leitura do Deniaros</p>
          <strong>{analysis.mainInsight}</strong>
          <p>{analysis.supportingInsight}</p>
        </article>

        <article className="trajectory-insight-card">
          <p className="mini-label">Ação mais útil agora</p>
          <strong>{analysis.recommendedAction}</strong>
          <p>{analysis.recommendedReason}</p>
        </article>
      </div>

      <div className="trajectory-actions">
        <Link
          className="primary-button"
          href={`/assistant?question=${encodeURIComponent(analysis.assistantQuestion)}`}
        >
          Perguntar ao Deniaros
        </Link>
        <Link className="ghost-button" href="/reports">
          Ver relatórios
        </Link>
        <Link className="ghost-button" href="/financial-agenda">
          Ajustar agenda
        </Link>
      </div>
    </section>
  );
}

function buildTrajectoryAnalysis({
  categories,
  payees,
  projection,
  transactions
}: {
  categories: Category[];
  payees: Payee[];
  projection: ForecastProjection;
  transactions: Transaction[];
}) {
  const today = normalizeDate(new Date());
  const currentStart = addDays(today, -30);
  const previousStart = addDays(today, -60);
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const payeeNames = new Map(payees.map((payee) => [payee.id, payee.name]));
  let currentPeriodExpenses = 0;
  let previousPeriodExpenses = 0;
  const expensesByCategory = new Map<string, RankedItem>();
  const expensesByPayee = new Map<string, RankedItem>();

  for (const transaction of transactions) {
    if (!isPostedTransaction(transaction) || transaction.transferAccountId || transaction.amount >= 0) {
      continue;
    }

    const date = parseIsoDate(transaction.date);
    const amount = Math.abs(transaction.amount);

    if (date >= currentStart && date <= today) {
      currentPeriodExpenses += amount;
      addRankedAmount(
        expensesByCategory,
        transaction.categoryId ?? "uncategorized",
        categoryNames.get(transaction.categoryId ?? "") ?? "Sem categoria",
        amount
      );
      addRankedAmount(
        expensesByPayee,
        transaction.payeeId ?? "without-payee",
        payeeNames.get(transaction.payeeId ?? "") ?? transaction.description,
        amount
      );
      continue;
    }

    if (date >= previousStart && date < currentStart) {
      previousPeriodExpenses += amount;
    }
  }

  const topExpense = getTopRankedItem(expensesByCategory) ?? getTopRankedItem(expensesByPayee);
  const expenseDelta = currentPeriodExpenses - previousPeriodExpenses;
  const expenseDeltaCopy =
    previousPeriodExpenses <= 0
      ? "Esse é o primeiro recorte útil para comparação."
      : expenseDelta > 0
        ? `Subiu ${Math.round((expenseDelta / previousPeriodExpenses) * 100)}% contra os 30 dias anteriores.`
        : `Caiu ${Math.abs(Math.round((expenseDelta / previousPeriodExpenses) * 100))}% contra os 30 dias anteriores.`;
  const { summary } = projection;
  const hasPressure = summary.riskLevel !== "stable";
  const mainInsight =
    hasPressure && topExpense
      ? `${topExpense.label} está influenciando sua margem de segurança.`
      : hasPressure
        ? "A agenda futura está pressionando sua margem de segurança."
        : "Seu histórico recente sustenta uma projeção mais confortável.";
  const supportingInsight =
    hasPressure
      ? "A prioridade é mexer antes do vencimento crítico, não depois que o saldo já apertou."
      : "A próxima evolução é usar essa folga para antecipar escolhas: reserva, metas ou redução de débitos.";
  const recommendedAction =
    summary.riskLevel === "danger"
      ? "Reprogramar vencimentos ou antecipar entrada"
      : summary.riskLevel === "attention"
        ? "Revisar categorias concentradas"
        : "Definir uma meta para a folga prevista";
  const recommendedReason =
    summary.riskLevel === "danger"
      ? "O menor saldo projetado exige uma ação antes da data sensível."
      : summary.riskLevel === "attention"
        ? "Pequenas correções agora evitam aperto no fechamento do período."
        : "Quando o caixa está sob controle, o sistema pode deixar de registrar passado e começar a construir futuro.";
  const assistantQuestion =
    summary.riskLevel === "danger"
      ? "Olhe meu histórico e minha previsão. O que eu posso fazer hoje para evitar o aperto de caixa?"
      : summary.riskLevel === "attention"
        ? "Quais hábitos recentes estão pressionando minha previsão e qual ajuste faria mais diferença?"
        : "Com base no meu histórico e na previsão, qual seria o melhor próximo passo para evoluir minha vida financeira?";

  return {
    assistantQuestion,
    currentPeriodExpenses,
    expenseDeltaCopy,
    mainInsight,
    recommendedAction,
    recommendedReason,
    supportingInsight,
    topExpense
  };
}

function addRankedAmount(map: Map<string, RankedItem>, id: string, label: string, value: number) {
  const current = map.get(id);

  if (current) {
    current.value += value;
    return;
  }

  map.set(id, {
    id,
    label,
    value
  });
}

function getTopRankedItem(map: Map<string, RankedItem>) {
  return [...map.values()].sort((a, b) => b.value - a.value)[0];
}

function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  nextDate.setHours(12, 0, 0, 0);
  return nextDate;
}

function parseIsoDate(value: string) {
  return new Date(`${value}T12:00:00`);
}
