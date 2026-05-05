export type SpendingDecision = "can_spend" | "risky" | "not_recommended";

export type SpendingCommitment = {
  amount: number;
  date: string;
  title: string;
};

export type SpendingSimulationInput = {
  amount: number;
  commitments?: SpendingCommitment[];
  currentBalance: number;
  description?: string;
  riskBuffer?: number;
  spendDate: string;
};

export type SpendingSimulationResult = {
  consideredCommitments: SpendingCommitment[];
  decision: SpendingDecision;
  label: "Pode" | "Pode, mas com risco" | "Não deveria";
  message: string;
  minimumBalance: number;
  squeezeDate?: string;
};

export function simulateSpendingDecision({
  amount,
  commitments = [],
  currentBalance,
  description,
  riskBuffer = 100,
  spendDate
}: SpendingSimulationInput): SpendingSimulationResult {
  const normalizedAmount = Math.max(0, Number.isFinite(amount) ? amount : 0);
  const spendIsoDate = normalizeIsoDate(spendDate);
  const consideredCommitments = commitments
    .filter((commitment) => normalizeIsoDate(commitment.date) >= spendIsoDate)
    .sort((a, b) => normalizeIsoDate(a.date).localeCompare(normalizeIsoDate(b.date)));
  const timeline = [
    {
      amount: -normalizedAmount,
      date: spendIsoDate,
      title: description?.trim() || "Gasto simulado"
    },
    ...consideredCommitments
  ].sort((a, b) => normalizeIsoDate(a.date).localeCompare(normalizeIsoDate(b.date)));

  let runningBalance = currentBalance;
  let minimumBalance = currentBalance;
  let squeezeDate: string | undefined;

  for (const event of timeline) {
    runningBalance += event.amount;

    if (runningBalance < minimumBalance) {
      minimumBalance = runningBalance;
      squeezeDate = normalizeIsoDate(event.date);
    }
  }

  const decision: SpendingDecision =
    minimumBalance < 0 ? "not_recommended" : minimumBalance < riskBuffer ? "risky" : "can_spend";
  const label = getDecisionLabel(decision);
  const message = buildDecisionMessage({
    amount: normalizedAmount,
    consideredCount: consideredCommitments.length,
    currentBalance,
    decision,
    minimumBalance,
    squeezeDate
  });

  return {
    consideredCommitments,
    decision,
    label,
    message,
    minimumBalance,
    squeezeDate
  };
}

function getDecisionLabel(decision: SpendingDecision): SpendingSimulationResult["label"] {
  if (decision === "not_recommended") {
    return "Não deveria";
  }

  if (decision === "risky") {
    return "Pode, mas com risco";
  }

  return "Pode";
}

function buildDecisionMessage({
  amount,
  consideredCount,
  currentBalance,
  decision,
  minimumBalance,
  squeezeDate
}: {
  amount: number;
  consideredCount: number;
  currentBalance: number;
  decision: SpendingDecision;
  minimumBalance: number;
  squeezeDate?: string;
}) {
  const amountText = formatPlainCurrency(amount);
  const currentText = formatPlainCurrency(currentBalance);
  const minimumText = formatPlainCurrency(minimumBalance);
  const eventText =
    consideredCount === 1
      ? "1 compromisso futuro"
      : `${consideredCount} compromissos futuros`;

  if (decision === "not_recommended") {
    return `Não recomendo esse gasto agora. Com ${amountText}, sua previsão chega a ${minimumText}${
      squeezeDate ? ` em ${formatPlainDate(squeezeDate)}` : ""
    }. Foram considerados saldo atual de ${currentText} e ${eventText}.`;
  }

  if (decision === "risky") {
    return `Você pode gastar ${amountText}, mas isso deixa sua margem em ${minimumText}${
      squeezeDate ? ` até ${formatPlainDate(squeezeDate)}` : ""
    }. Recomendo evitar se ainda houver mercado, transporte ou conta essencial pendente.`;
  }

  return `Pode. Depois desse gasto, seu menor saldo projetado fica em ${minimumText}. Foram considerados saldo atual de ${currentText} e ${eventText}.`;
}

function formatPlainCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency"
  }).format(value);
}

function formatPlainDate(value: string) {
  const date = new Date(`${normalizeIsoDate(value)}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  }).format(date);
}

function normalizeIsoDate(value: string) {
  const normalized = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : new Date().toISOString().slice(0, 10);
}
