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

type TrajectoryTone = "stable" | "attention" | "danger";

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
    attention: "Ajuste fino",
    danger: "Intervenção",
    stable: "Rota controlada"
  }[summary.riskLevel];
  const futureCopy =
    summary.riskLevel === "danger"
      ? `Pode tocar ${formatCurrency(summary.lowestBalance, baseCurrency, locale)} em ${formatShortDate(
          summary.lowestDate,
          locale
        )}.`
      : summary.riskLevel === "attention"
        ? `${formatShortDate(summary.lowestDate, locale)} é o ponto sensível.`
        : `Menor saldo: ${formatCurrency(summary.lowestBalance, baseCurrency, locale)}.`;

  return (
    <section className="col-span-full rounded-lg border border-[#1D4D3A]/15 bg-[#FAF9F6] p-4 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Passado para projetar futuro
          </p>
          <h3 className="mt-1 font-serif text-2xl font-extrabold leading-none text-slate-900">
            Sua trajetória financeira
          </h3>
        </div>
        <span className={buildRiskChipClass(summary.riskLevel)}>{riskCopy}</span>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <TrajectoryMetricCard
          index="01"
          label="Passado recente"
          tone="stable"
          tooltip={analysis.expenseDeltaCopy}
          value={formatCurrency(analysis.currentPeriodExpenses, baseCurrency, locale)}
        />
        <TrajectoryMetricCard
          index="02"
          label="Padrão detectado"
          tone="attention"
          tooltip={
            analysis.topExpense
              ? `${formatCurrency(analysis.topExpense.value, baseCurrency, locale)} concentrados nessa frente.`
              : "Ainda falta histórico para apontar concentração real."
          }
          value={analysis.topExpense?.label ?? "Sem padrão"}
        />
        <TrajectoryMetricCard
          index="03"
          label="Futuro provável"
          tone={summary.riskLevel}
          tooltip={futureCopy}
          value={formatCurrency(summary.endingBalance, baseCurrency, locale)}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <TrajectoryInsight
          label="Leitura do Deniaros"
          text={analysis.supportingInsight}
          title={analysis.mainInsight}
        />
        <TrajectoryInsight
          label="Ação mais útil agora"
          text={analysis.recommendedReason}
          title={analysis.recommendedAction}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          className="rounded-md bg-[#1D4D3A] px-4 py-2 text-sm font-extrabold text-stone-50 shadow-sm transition-colors duration-200 hover:bg-[#163B2D]"
          href={`/assistant?question=${encodeURIComponent(analysis.assistantQuestion)}`}
        >
          Perguntar ao Deniaros
        </Link>
        <Link
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-extrabold text-slate-900 transition-colors duration-200 hover:bg-stone-100"
          href="/reports"
        >
          Ver relatórios
        </Link>
        <Link
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-extrabold text-slate-900 transition-colors duration-200 hover:bg-stone-100"
          href="/financial-agenda"
        >
          Ajustar agenda
        </Link>
      </div>
    </section>
  );
}

function TrajectoryMetricCard({
  index,
  label,
  tone,
  tooltip,
  value
}: {
  index: string;
  label: string;
  tone: TrajectoryTone;
  tooltip: string;
  value: string;
}) {
  return (
    <article
      className="flex h-full min-h-36 flex-col justify-between rounded-md border border-[#1D4D3A]/15 bg-stone-50 p-3 shadow-sm"
      title={tooltip}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
        <span className="grid size-7 place-items-center rounded-md border border-[#B88938]/40 text-xs font-extrabold text-[#B88938]">
          {index}
        </span>
      </div>
      <strong className={buildMetricClass(tone)}>{value}</strong>
    </article>
  );
}

function TrajectoryInsight({ label, text, title }: { label: string; text: string; title: string }) {
  return (
    <article className="flex h-full flex-col justify-between rounded-md border border-stone-200 bg-white/70 p-3 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
        <strong className="mt-2 block text-lg font-extrabold leading-tight text-slate-900">{title}</strong>
      </div>
      <p className="mt-2 text-sm font-medium leading-snug text-stone-600">{text}</p>
    </article>
  );
}

function buildMetricClass(tone: TrajectoryTone) {
  const toneClass = {
    attention: "text-[#B88938]",
    danger: "text-[#9C3F29]",
    stable: "text-[#1D4D3A]"
  }[tone];

  return `mt-4 block break-words text-2xl font-extrabold leading-none tracking-tight md:text-3xl ${toneClass}`;
}

function buildRiskChipClass(tone: TrajectoryTone) {
  const toneClass = {
    attention: "border-[#B88938]/30 bg-[#B88938]/10 text-[#7A561A]",
    danger: "border-[#9C3F29]/25 bg-[#9C3F29]/10 text-[#9C3F29]",
    stable: "border-[#1D4D3A]/20 bg-[#1D4D3A]/10 text-[#1D4D3A]"
  }[tone];

  return `rounded-md border px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${toneClass}`;
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
      ? "Primeiro recorte útil para comparação."
      : expenseDelta > 0
        ? `Subiu ${Math.round((expenseDelta / previousPeriodExpenses) * 100)}% contra os 30 dias anteriores.`
        : `Caiu ${Math.abs(Math.round((expenseDelta / previousPeriodExpenses) * 100))}% contra os 30 dias anteriores.`;
  const { summary } = projection;
  const hasPressure = summary.riskLevel !== "stable";
  const mainInsight =
    hasPressure && topExpense
      ? `${topExpense.label} influencia sua margem.`
      : hasPressure
        ? "A agenda futura pressiona sua margem."
        : "Seu histórico sustenta uma projeção confortável.";
  const supportingInsight =
    hasPressure
      ? "A prioridade é mexer antes do vencimento crítico."
      : "Use a folga para reserva, metas ou redução de débitos.";
  const recommendedAction =
    summary.riskLevel === "danger"
      ? "Reprogramar vencimentos"
      : summary.riskLevel === "attention"
        ? "Revisar categorias concentradas"
        : "Definir meta para a folga";
  const recommendedReason =
    summary.riskLevel === "danger"
      ? "O menor saldo projetado exige ação antes da data sensível."
      : summary.riskLevel === "attention"
        ? "Pequenas correções agora evitam aperto no fechamento."
        : "Com caixa sob controle, o próximo passo é construir futuro.";
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
