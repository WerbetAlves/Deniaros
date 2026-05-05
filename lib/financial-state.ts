export type FinancialWorkspaceState =
  | "empty"
  | "initialized"
  | "active"
  | "at_risk"
  | "emergency";

export type FinancialStateTone = "stable" | "attention" | "danger";

export type FinancialStateInput = {
  accountCount: number;
  transactionCount: number;
  overdueCommitmentCount?: number;
  dueSoonCommitmentCount?: number;
  currentBalance?: number;
  next7DaysNetCommitments?: number;
  projectedLowestBalance?: number;
  firstNegativeDate?: string;
};

export type FinancialNextStep = {
  actionLabel: string;
  description: string;
  href: string;
  secondaryHref: string;
  secondaryLabel: string;
  state: FinancialWorkspaceState;
  title: string;
  tone: FinancialStateTone;
};

export function classifyFinancialWorkspaceState({
  accountCount,
  currentBalance = 0,
  dueSoonCommitmentCount = 0,
  firstNegativeDate,
  next7DaysNetCommitments = 0,
  overdueCommitmentCount = 0,
  projectedLowestBalance = currentBalance,
  transactionCount
}: FinancialStateInput): FinancialWorkspaceState {
  if (accountCount <= 0) {
    return "empty";
  }

  if (transactionCount <= 0) {
    return "initialized";
  }

  const expensesDueSoon = Math.abs(Math.min(next7DaysNetCommitments, 0));
  const marginAfterDueSoon = currentBalance - expensesDueSoon;

  if (
    overdueCommitmentCount > 0 ||
    marginAfterDueSoon < 0 ||
    (Boolean(firstNegativeDate) && projectedLowestBalance < 0)
  ) {
    return "emergency";
  }

  const lowCashMargin = expensesDueSoon > 0 && marginAfterDueSoon <= Math.max(80, currentBalance * 0.15);

  if (dueSoonCommitmentCount > 0 || projectedLowestBalance <= Math.max(100, currentBalance * 0.2) || lowCashMargin) {
    return "at_risk";
  }

  return "active";
}

export function getFinancialNextStep(state: FinancialWorkspaceState): FinancialNextStep {
  if (state === "empty") {
    return {
      actionLabel: "Criar primeira carteira",
      description: "Antes de prever o futuro, o Deniaros precisa saber onde seu dinheiro começa.",
      href: "/accounts?mode=create&kind=cash&first=1",
      secondaryHref: "/imports?onboarding=1",
      secondaryLabel: "Importar extrato",
      state,
      title: "Vamos montar sua base financeira.",
      tone: "attention"
    };
  }

  if (state === "initialized") {
    return {
      actionLabel: "Registrar movimento",
      description: "Com entradas e saídas reais, o Deniaros começa a calcular sua previsão.",
      href: "/transactions/new",
      secondaryHref: "/imports?onboarding=1",
      secondaryLabel: "Importar extrato",
      state,
      title: "Sua base está pronta. Agora registre o primeiro movimento.",
      tone: "attention"
    };
  }

  if (state === "at_risk") {
    return {
      actionLabel: "Ver risco",
      description: "Seu saldo pode apertar nos próximos dias. Revise compromissos antes de gastar.",
      href: "/financial-agenda",
      secondaryHref: "#posso-gastar",
      secondaryLabel: "Simular gasto",
      state,
      title: "Atenção: existe risco financeiro à frente.",
      tone: "danger"
    };
  }

  if (state === "emergency") {
    return {
      actionLabel: "Entrar no modo emergência",
      description: "Primeiro o essencial. Depois o negociável. O importante agora é parar o sangramento.",
      href: "#modo-emergencia",
      secondaryHref: "/financial-agenda?status=overdue",
      secondaryLabel: "Ver contas vencidas",
      state,
      title: "Vamos organizar por urgência.",
      tone: "danger"
    };
  }

  return {
    actionLabel: "Ver previsão",
    description: "Veja sua previsão e acompanhe os próximos compromissos.",
    href: "/financial-agenda",
    secondaryHref: "#posso-gastar",
    secondaryLabel: "Simular gasto",
    state,
    title: "Você já tem base para decisões melhores.",
    tone: "stable"
  };
}
