export type QuickOnboardingUsage =
  | "personal"
  | "family"
  | "small_business"
  | "driver_self_employed"
  | "other";

export type QuickOnboardingGoal =
  | "organize_spending"
  | "leave_debt"
  | "build_reserve"
  | "variable_income"
  | "plan_month";

export type QuickOnboardingIncomeMode =
  | "fixed_salary"
  | "variable_income"
  | "business_sales"
  | "apps_freelas"
  | "multiple_sources";

export type QuickOnboardingStartMode = "manual" | "import_csv" | "structure_only";
export type QuickOnboardingAiLevel = "basic" | "consultative" | "active";

export type QuickOnboardingAnswers = {
  aiLevel: QuickOnboardingAiLevel;
  completedAt?: string;
  goal: QuickOnboardingGoal;
  incomeMode: QuickOnboardingIncomeMode;
  startMode: QuickOnboardingStartMode;
  usage: QuickOnboardingUsage;
};

export type OnboardingGuidance = {
  accountActionLabel: string;
  accountDescription: string;
  accountHref: string;
  aiDescription: string;
  contextLabel: string;
  nextActionHint: string;
  quickStartSubtitle: string;
  scheduleDescription: string;
  starterMetricLabel: string;
  starterMetricValue: string;
  transactionActionLabel: string;
  transactionDescription: string;
  transactionHref: string;
};

const usageOptions = ["personal", "family", "small_business", "driver_self_employed", "other"] as const;
const goalOptions = ["organize_spending", "leave_debt", "build_reserve", "variable_income", "plan_month"] as const;
const incomeModeOptions = ["fixed_salary", "variable_income", "business_sales", "apps_freelas", "multiple_sources"] as const;
const startModeOptions = ["manual", "import_csv", "structure_only"] as const;
const aiLevelOptions = ["basic", "consultative", "active"] as const;

export function getQuickOnboardingAnswers(classicAnswers: unknown): QuickOnboardingAnswers | null {
  const root = asRecord(classicAnswers);
  const quickOnboarding = asRecord(root?.quickOnboarding);

  if (!quickOnboarding) {
    return null;
  }

  return {
    aiLevel: normalizeOption(quickOnboarding.aiLevel, aiLevelOptions, "consultative"),
    completedAt: typeof quickOnboarding.completedAt === "string" ? quickOnboarding.completedAt : undefined,
    goal: normalizeOption(quickOnboarding.goal, goalOptions, "organize_spending"),
    incomeMode: normalizeOption(quickOnboarding.incomeMode, incomeModeOptions, "fixed_salary"),
    startMode: normalizeOption(quickOnboarding.startMode, startModeOptions, "manual"),
    usage: normalizeOption(quickOnboarding.usage, usageOptions, "personal")
  };
}

export function buildOnboardingGuidance(answers: QuickOnboardingAnswers | null): OnboardingGuidance {
  const usage = answers?.usage ?? "personal";
  const goal = answers?.goal ?? "organize_spending";
  const incomeMode = answers?.incomeMode ?? "fixed_salary";
  const startMode = answers?.startMode ?? "manual";
  const aiLevel = answers?.aiLevel ?? "consultative";

  return {
    accountActionLabel: startMode === "import_csv" ? "Criar carteira base" : "Criar primeira carteira",
    accountDescription: getAccountDescription(usage, incomeMode),
    accountHref: "/accounts?mode=create&kind=cash&first=1",
    aiDescription: getAiDescription(aiLevel, goal),
    contextLabel: getContextLabel(usage, goal),
    nextActionHint: getNextActionHint(goal, startMode),
    quickStartSubtitle: getQuickStartSubtitle(goal, startMode),
    scheduleDescription: getScheduleDescription(goal),
    starterMetricLabel: getStarterMetricLabel(startMode),
    starterMetricValue: getStarterMetricValue(startMode),
    transactionActionLabel: startMode === "import_csv" ? "Importar extrato" : "Novo movimento",
    transactionDescription: getTransactionDescription(startMode, incomeMode),
    transactionHref: startMode === "import_csv" ? "/imports?onboarding=1" : "/transactions/new"
  };
}

function getAccountDescription(usage: QuickOnboardingUsage, incomeMode: QuickOnboardingIncomeMode) {
  if (usage === "family") {
    return "Crie a conta ou carteira que concentra o dinheiro da familia ou do casal.";
  }

  if (usage === "small_business") {
    return "Separe a base do negocio para enxergar caixa, entradas e compromissos sem misturar tudo.";
  }

  if (usage === "driver_self_employed" || incomeMode === "apps_freelas") {
    return "Crie a carteira usada na rotina para acompanhar ganhos variaveis, combustivel e contas.";
  }

  return "Cadastre a carteira ou conta que mostra onde seu dinheiro comeca hoje.";
}

function getAiDescription(aiLevel: QuickOnboardingAiLevel, goal: QuickOnboardingGoal) {
  if (aiLevel === "basic") {
    return "Quando houver base real, o Consultor IA resume numeros e riscos sem tomar a frente.";
  }

  if (aiLevel === "active") {
    return "Quando houver base real, o Consultor IA aponta risco, prioridade e o proximo passo.";
  }

  if (goal === "leave_debt") {
    return "Quando houver base real, o Consultor IA ajuda a priorizar dividas, vencimentos e alivio de caixa.";
  }

  return "Quando houver base real, o Consultor IA transforma saldo, agenda e previsao em orientacao pratica.";
}

function getContextLabel(usage: QuickOnboardingUsage, goal: QuickOnboardingGoal) {
  const usageLabel: Record<QuickOnboardingUsage, string> = {
    driver_self_employed: "autonomo",
    family: "familia",
    other: "base pessoal",
    personal: "vida pessoal",
    small_business: "negocio"
  };
  const goalLabel: Record<QuickOnboardingGoal, string> = {
    build_reserve: "reserva",
    leave_debt: "dividas",
    organize_spending: "gastos",
    plan_month: "mes",
    variable_income: "renda variavel"
  };

  return `${usageLabel[usage]} / ${goalLabel[goal]}`;
}

function getNextActionHint(goal: QuickOnboardingGoal, startMode: QuickOnboardingStartMode) {
  if (startMode === "import_csv") {
    return "Importe um extrato depois da primeira carteira para criar base real mais rapido.";
  }

  if (goal === "leave_debt") {
    return "Monte a base primeiro; depois o Deniaros ajuda a ordenar dividas e vencimentos.";
  }

  if (goal === "build_reserve") {
    return "Monte a base primeiro; depois o Deniaros mostra quanto preservar antes de gastar.";
  }

  if (goal === "variable_income") {
    return "Monte a base primeiro; depois o Deniaros separa entradas variaveis de compromissos fixos.";
  }

  return "Monte a base primeiro; previsao e orientacao aparecem quando houver dados reais.";
}

function getQuickStartSubtitle(goal: QuickOnboardingGoal, startMode: QuickOnboardingStartMode) {
  const startText =
    startMode === "import_csv"
      ? "primeiro uma carteira, depois importacao e conferencia dos movimentos"
      : "primeiro uma carteira, depois movimento real, importacao ou agenda";

  if (goal === "leave_debt") {
    return `A ordem importa: ${startText}. So entao o Deniaros consegue mostrar risco, dividas e prioridade sem chute.`;
  }

  if (goal === "plan_month") {
    return `A ordem importa: ${startText}. A previsao do mes aparece quando a base existir.`;
  }

  return `A ordem importa: ${startText}. A previsao aparece quando a base existir.`;
}

function getScheduleDescription(goal: QuickOnboardingGoal) {
  if (goal === "leave_debt") {
    return "Cadastre dividas, contas e vencimentos para o sistema organizar o que e urgente.";
  }

  if (goal === "build_reserve") {
    return "Cadastre contas e reservas para saber quanto pode guardar sem apertar o mes.";
  }

  if (goal === "variable_income") {
    return "Cadastre contas fixas e entradas previstas para comparar renda variavel com compromissos.";
  }

  return "Cadastre contas, depositos ou lembretes para projetar o caixa antes do aperto.";
}

function getStarterMetricLabel(startMode: QuickOnboardingStartMode) {
  if (startMode === "import_csv") {
    return "Inicio por importacao";
  }

  if (startMode === "structure_only") {
    return "Estrutura primeiro";
  }

  return "Inicio manual";
}

function getStarterMetricValue(startMode: QuickOnboardingStartMode) {
  if (startMode === "import_csv") {
    return "Importar extrato";
  }

  if (startMode === "structure_only") {
    return "Criar base";
  }

  return "Criar carteira";
}

function getTransactionDescription(
  startMode: QuickOnboardingStartMode,
  incomeMode: QuickOnboardingIncomeMode
) {
  if (startMode === "import_csv") {
    return "Importe um extrato CSV para criar movimentos reais sem preencher tudo manualmente.";
  }

  if (startMode === "structure_only") {
    return "Depois da estrutura, registre o primeiro movimento quando quiser ativar previsao.";
  }

  if (incomeMode === "variable_income" || incomeMode === "multiple_sources") {
    return "Registre uma entrada ou saida real para o sistema entender sua renda variavel.";
  }

  return "Registre uma entrada ou saida real para o sistema entender seu passado recente.";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeOption<const T extends readonly string[]>(
  value: unknown,
  options: T,
  fallback: T[number]
): T[number] {
  return typeof value === "string" && options.includes(value) ? value : fallback;
}
