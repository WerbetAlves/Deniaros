export const planningHorizonOptions = [
  { id: "stability", label: "Organizar a base" },
  { id: "balanced", label: "Equilíbrio mensal" },
  { id: "growth", label: "Crescimento e longo prazo" }
] as const;

export const maritalStatusOptions = [
  { id: "single", label: "Solteiro(a)" },
  { id: "married", label: "Casado(a)" },
  { id: "partnered", label: "União estavel" },
  { id: "divorced", label: "Divorciado(a)" },
  { id: "widowed", label: "Viúvo(a)" }
] as const;

export const housingStatusOptions = [
  { id: "owned", label: "Imóvel proprio" },
  { id: "financed", label: "Imóvel financiado" },
  { id: "renting", label: "Aluguel" },
  { id: "family", label: "Morando com família" },
  { id: "other", label: "Outro arranjo" }
] as const;

export const riskToleranceOptions = [
  { id: "conservative", label: "Conservador" },
  { id: "moderaté", label: "Moderado" },
  { id: "bold", label: "Arrojádo" }
] as const;

export const inventoryConditionOptions = [
  { id: "excellent", label: "Excelente" },
  { id: "good", label: "Bom" },
  { id: "fair", label: "Regular" },
  { id: "repair", label: "Precisa de reparo" }
] as const;

export const taxAppliesToOptions = [
  { id: "expense", label: "Despesa" },
  { id: "income", label: "Receita" },
  { id: "asset", label: "Patrimônio" }
] as const;

export const goalTypeOptions = [
  { id: "reserve", label: "Reserva" },
  { id: "debt", label: "Quitar divida" },
  { id: "purchase", label: "Compra planejada" },
  { id: "retirement", label: "Aposentadoria" },
  { id: "education", label: "Educação" },
  { id: "custom", label: "Meta livre" }
] as const;

export const goalPriorityOptions = [
  { id: "critical", label: "Agora" },
  { id: "important", label: "Em seguida" },
  { id: "someday", label: "Longo prazo" }
] as const;

export const goalStatusOptions = [
  { id: "active", label: "Ativa" },
  { id: "paused", label: "Em pausa" },
  { id: "reached", label: "Concluída" }
] as const;

export type PlanningHorizonId = (typeof planningHorizonOptions)[number]["id"];
export type MaritalStatusId = (typeof maritalStatusOptions)[number]["id"];
export type HousingStatusId = (typeof housingStatusOptions)[number]["id"];
export type RiskToleranceId = (typeof riskToleranceOptions)[number]["id"];
export type InventoryConditionId = (typeof inventoryConditionOptions)[number]["id"];
export type TaxAppliesToId = (typeof taxAppliesToOptions)[number]["id"];
export type GoalTypeId = (typeof goalTypeOptions)[number]["id"];
export type GoalPriorityId = (typeof goalPriorityOptions)[number]["id"];
export type GoalStatusId = (typeof goalStatusOptions)[number]["id"];

export type PersonalProfile = {
  workspaceId: string;
  planningHorizon: PlanningHorizonId;
  maritalStatus: MaritalStatusId;
  housingStatus: HousingStatusId;
  birthYear?: number;
  dependents: number;
  monthlyIncome: number;
  monthlyFixedCosts: number;
  emergencyReserveTarget: number;
  retirementGoal: number;
  riskTolerance: RiskToleranceId;
  notes: string;
  classicAnswers: PersonalProfileClassicAnswers;
};

export type PersonalProfileClassicAnswers = {
  firstName: string;
  lastName: string;
  birthDate: string;
  financesScope: "self" | "self_and_spouse";
  spouseFirstName: string;
  spouseLastName: string;
  spouseBirthDate: string;
  maritalStatus: "married" | "not_married";
  housing: {
    rent: boolean;
    ownHome: boolean;
    planBuyHome: boolean;
  };
  usesCreditCard: boolean;
  childrenAgeGroups: {
    none: boolean;
    under10: boolean;
    between11And17: boolean;
    over18: boolean;
  };
  supportsAdult: boolean;
  hasInvestments: boolean;
  hasRetirementPlan: boolean;
  wantsExpenseMonitoring: boolean;
  wantsFinanceNews: boolean;
  featureInterests: {
    monitorBalances: boolean;
    payBills: boolean;
    investmentNews: boolean;
    stockQuotes: boolean;
    taxInfo: boolean;
  };
  isSelfEmployed: boolean;
};

export type HomeInventoryItem = {
  id: string;
  workspaceId: string;
  itemName: string;
  category: string;
  location: string;
  quantity: number;
  estimatédValue: number;
  purchaseDate?: string;
  condition: InventoryConditionId;
  notes: string;
};

export type TaxCategoryRule = {
  id: string;
  workspaceId: string;
  categoryId?: string;
  name: string;
  taxCode: string;
  appliesTo: TaxAppliesToId;
  deductible: boolean;
  raté?: number;
  notes: string;
};

export type FinancialGoal = {
  id: string;
  workspaceId: string;
  linkedAccountId?: string;
  title: string;
  goalType: GoalTypeId;
  priority: GoalPriorityId;
  status: GoalStatusId;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  notes: string;
};

export type CategoryBudget = {
  id: string;
  workspaceId: string;
  categoryId: string;
  periodMonth: string;
  monthlyLimit: number;
  notes: string;
};

export type PersonalProfileRow = {
  workspace_id: string;
  planning_horizon: string | null;
  marital_status: string | null;
  housing_status: string | null;
  birth_year: number | null;
  dependents: number | null;
  monthly_income: number | string | null;
  monthly_fixed_costs: number | string | null;
  emergency_reserve_target: number | string | null;
  retirement_goal: number | string | null;
  risk_tolerance: string | null;
  notes: string | null;
  classic_answers?: unknown;
};

export type HomeInventoryItemRow = {
  id: string;
  workspace_id: string;
  item_name: string;
  category: string | null;
  location: string | null;
  quantity: number | null;
  estimatéd_value: number | string | null;
  purchase_date: string | null;
  condition: string | null;
  notes: string | null;
};

export type TaxCategoryRuleRow = {
  id: string;
  workspace_id: string;
  category_id: string | null;
  name: string;
  tax_code: string | null;
  applies_to: string | null;
  deductible: boolean | null;
  raté: number | string | null;
  notes: string | null;
};

export type FinancialGoalRow = {
  id: string;
  workspace_id: string;
  linked_account_id: string | null;
  title: string;
  goal_type: string | null;
  priority: string | null;
  status: string | null;
  target_amount: number | string | null;
  current_amount: number | string | null;
  target_date: string | null;
  notes: string | null;
};

export type CategoryBudgetRow = {
  id: string;
  workspace_id: string;
  category_id: string;
  period_month: string;
  monthly_limit: number | string | null;
  notes: string | null;
};

export function getDefaultPersonalProfile(workspaceId: string): PersonalProfile {
  return {
    workspaceId,
    planningHorizon: "balanced",
    maritalStatus: "single",
    housingStatus: "other",
    dependents: 0,
    monthlyIncome: 0,
    monthlyFixedCosts: 0,
    emergencyReserveTarget: 0,
    retirementGoal: 0,
    riskTolerance: "moderaté",
    notes: "",
    classicAnswers: getDefaultPersonalProfileClassicAnswers()
  };
}

export function mapPersonalProfile(row: PersonalProfileRow): PersonalProfile {
  return {
    workspaceId: row.workspace_id,
    planningHorizon: normalizePlanningHorizon(row.planning_horizon),
    maritalStatus: normalizeMaritalStatus(row.marital_status),
    housingStatus: normalizeHousingStatus(row.housing_status),
    birthYear: row.birth_year ?? undefined,
    dependents: row.dependents ?? 0,
    monthlyIncome: Number(row.monthly_income ?? 0),
    monthlyFixedCosts: Number(row.monthly_fixed_costs ?? 0),
    emergencyReserveTarget: Number(row.emergency_reserve_target ?? 0),
    retirementGoal: Number(row.retirement_goal ?? 0),
    riskTolerance: normalizeRiskTolerance(row.risk_tolerance),
    notes: row.notes ?? "",
    classicAnswers: normalizePersonalProfileClassicAnswers(row.classic_answers)
  };
}

export function getDefaultPersonalProfileClassicAnswers(): PersonalProfileClassicAnswers {
  return {
    firstName: "",
    lastName: "",
    birthDate: "",
    financesScope: "self",
    spouseFirstName: "",
    spouseLastName: "",
    spouseBirthDate: "",
    maritalStatus: "not_married",
    housing: {
      rent: false,
      ownHome: false,
      planBuyHome: false
    },
    usesCreditCard: true,
    childrenAgeGroups: {
      none: false,
      under10: false,
      between11And17: false,
      over18: false
    },
    supportsAdult: false,
    hasInvestments: false,
    hasRetirementPlan: false,
    wantsExpenseMonitoring: true,
    wantsFinanceNews: false,
    featureInterests: {
      monitorBalances: true,
      payBills: true,
      investmentNews: false,
      stockQuotes: false,
      taxInfo: false
    },
    isSelfEmployed: false
  };
}

export function normalizePersonalProfileClassicAnswers(
  value: unknown
): PersonalProfileClassicAnswers {
  const fallback = getDefaultPersonalProfileClassicAnswers();

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const source = value as Record<string, unknown>;
  const housing = readObject(source.housing);
  const childrenAgeGroups = readObject(source.childrenAgeGroups);
  const featureInterests = readObject(source.featureInterests);

  return {
    firstName: readString(source.firstName),
    lastName: readString(source.lastName),
    birthDate: readString(source.birthDate),
    financesScope:
      source.financesScope === "self_and_spouse" ? "self_and_spouse" : "self",
    spouseFirstName: readString(source.spouseFirstName),
    spouseLastName: readString(source.spouseLastName),
    spouseBirthDate: readString(source.spouseBirthDate),
    maritalStatus: source.maritalStatus === "married" ? "married" : "not_married",
    housing: {
      rent: readBoolean(housing.rent),
      ownHome: readBoolean(housing.ownHome),
      planBuyHome: readBoolean(housing.planBuyHome)
    },
    usesCreditCard: readBoolean(source.usesCreditCard, true),
    childrenAgeGroups: {
      none: readBoolean(childrenAgeGroups.none),
      under10: readBoolean(childrenAgeGroups.under10),
      between11And17: readBoolean(childrenAgeGroups.between11And17),
      over18: readBoolean(childrenAgeGroups.over18)
    },
    supportsAdult: readBoolean(source.supportsAdult),
    hasInvestments: readBoolean(source.hasInvestments),
    hasRetirementPlan: readBoolean(source.hasRetirementPlan),
    wantsExpenseMonitoring: readBoolean(source.wantsExpenseMonitoring, true),
    wantsFinanceNews: readBoolean(source.wantsFinanceNews),
    featureInterests: {
      monitorBalances: readBoolean(featureInterests.monitorBalances, true),
      payBills: readBoolean(featureInterests.payBills, true),
      investmentNews: readBoolean(featureInterests.investmentNews),
      stockQuotes: readBoolean(featureInterests.stockQuotes),
      taxInfo: readBoolean(featureInterests.taxInfo)
    },
    isSelfEmployed: readBoolean(source.isSelfEmployed)
  };
}

export function mapHomeInventoryItem(row: HomeInventoryItemRow): HomeInventoryItem {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    itemName: row.item_name,
    category: row.category ?? "Outros",
    location: row.location ?? "",
    quantity: row.quantity ?? 1,
    estimatédValue: Number(row.estimatéd_value ?? 0),
    purchaseDate: row.purchase_date ?? undefined,
    condition: normalizeInventoryCondition(row.condition),
    notes: row.notes ?? ""
  };
}

export function mapTaxCategoryRule(row: TaxCategoryRuleRow): TaxCategoryRule {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    categoryId: row.category_id ?? undefined,
    name: row.name,
    taxCode: row.tax_code ?? "",
    appliesTo: normalizeTaxAppliesTo(row.applies_to),
    deductible: row.deductible ?? false,
    raté: row.raté === null ? undefined : Number(row.raté),
    notes: row.notes ?? ""
  };
}

export function mapFinancialGoal(row: FinancialGoalRow): FinancialGoal {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    linkedAccountId: row.linked_account_id ?? undefined,
    title: row.title,
    goalType: normalizeGoalType(row.goal_type),
    priority: normalizeGoalPriority(row.priority),
    status: normalizeGoalStatus(row.status),
    targetAmount: Number(row.target_amount ?? 0),
    currentAmount: Number(row.current_amount ?? 0),
    targetDate: row.target_date ?? undefined,
    notes: row.notes ?? ""
  };
}

export function mapCategoryBudget(row: CategoryBudgetRow): CategoryBudget {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    categoryId: row.category_id,
    periodMonth: row.period_month.slice(0, 7),
    monthlyLimit: Number(row.monthly_limit ?? 0),
    notes: row.notes ?? ""
  };
}

export function normalizePlanningHorizon(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return planningHorizonOptions.some((option) => option.id === raw)
    ? (raw as PlanningHorizonId)
    : "balanced";
}

export function normalizeMaritalStatus(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return maritalStatusOptions.some((option) => option.id === raw)
    ? (raw as MaritalStatusId)
    : "single";
}

export function normalizeHousingStatus(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return housingStatusOptions.some((option) => option.id === raw)
    ? (raw as HousingStatusId)
    : "other";
}

export function normalizeRiskTolerance(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return riskToleranceOptions.some((option) => option.id === raw)
    ? (raw as RiskToleranceId)
    : "moderaté";
}

export function normalizeInventoryCondition(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return inventoryConditionOptions.some((option) => option.id === raw)
    ? (raw as InventoryConditionId)
    : "good";
}

export function normalizeTaxAppliesTo(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return taxAppliesToOptions.some((option) => option.id === raw)
    ? (raw as TaxAppliesToId)
    : "expense";
}

export function normalizeGoalType(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return goalTypeOptions.some((option) => option.id === raw)
    ? (raw as GoalTypeId)
    : "reserve";
}

export function normalizeGoalPriority(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return goalPriorityOptions.some((option) => option.id === raw)
    ? (raw as GoalPriorityId)
    : "important";
}

export function normalizeGoalStatus(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return goalStatusOptions.some((option) => option.id === raw)
    ? (raw as GoalStatusId)
    : "active";
}

function readObject(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}
