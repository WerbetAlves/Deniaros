export type PlanVisualTier = "bronze" | "silver" | "gold" | "platinum";
export type PlanCommercialTier = "bronze" | "silver" | "gold" | "family" | "platinum";

export type SaasPlanLike = {
  billing_interval: "month" | "year" | "manual";
  features?: Record<string, unknown>;
  id: string;
  is_active?: boolean;
  is_public?: boolean;
  limits?: Record<string, unknown>;
  name: string;
  price_cents: number;
  stripe_lookup_key?: string | null;
  stripe_price_id?: string | null;
  stripe_product_id?: string | null;
  tier: string;
};

export type SaasSubscriptionLike = {
  current_period_ends_at?: string | null;
  plan_id: string;
  status: "trialing" | "active" | "past_due" | "canceled" | "suspended" | "manual";
  trial_ends_at?: string | null;
};

export const planTierLabels: Record<PlanVisualTier, string> = {
  bronze: "Bronze",
  gold: "Inteligente",
  platinum: "Platina",
  silver: "Controle"
};

export const planCommercialLabels: Record<PlanCommercialTier, string> = {
  bronze: "Bronze",
  family: "Família",
  gold: "Inteligente",
  platinum: "Platina",
  silver: "Controle"
};

export function resolvePlanVisualTier(planId?: string | null, tier?: string | null): PlanVisualTier {
  const normalizedPlanId = String(planId ?? "").toLowerCase();
  const normalizedTier = String(tier ?? "").toLowerCase();

  if (normalizedPlanId === "platinum_private" || normalizedTier === "platinum") {
    return "platinum";
  }

  if (
    normalizedPlanId === "family" ||
    normalizedPlanId === "business_lite" ||
    normalizedTier === "family" ||
    normalizedTier === "business"
  ) {
    return "gold";
  }

  if (normalizedPlanId === "pro" || normalizedTier === "pro") {
    return "silver";
  }

  return "bronze";
}

export function resolvePlanCommercialTier(planId?: string | null, tier?: string | null): PlanCommercialTier {
  const normalizedPlanId = String(planId ?? "").toLowerCase();
  const normalizedTier = String(tier ?? "").toLowerCase();

  if (normalizedPlanId === "platinum_private" || normalizedTier === "platinum") {
    return "platinum";
  }

  if (normalizedPlanId === "family" || normalizedTier === "family") {
    return "family";
  }

  if (normalizedPlanId === "business_lite" || normalizedTier === "business") {
    return "gold";
  }

  if (normalizedPlanId === "pro" || normalizedTier === "pro") {
    return "silver";
  }

  return "bronze";
}

export function getPlanDisplayName(plan?: SaasPlanLike | null) {
  if (!plan) {
    return "Deniaros Controle";
  }

  return getPlanDisplayNameFromId(plan.id, plan.tier);
}

export function getPlanDisplayNameFromId(planId?: string | null, tier?: string | null) {
  if (String(planId ?? "").toLowerCase() === "pro") {
    return "Deniaros Controle";
  }

  const commercialTier = resolvePlanCommercialTier(planId, tier);
  return `Deniaros ${planCommercialLabels[commercialTier]}`;
}

export function getPlanPosition(plan?: SaasPlanLike | null) {
  const tier = resolvePlanCommercialTier(plan?.id, plan?.tier);
  const labels: Record<PlanCommercialTier, string> = {
    bronze: "Base inicial",
    family: "Em desenvolvimento",
    gold: "Em desenvolvimento",
    platinum: "Liberação privada do fundador",
    silver: "Descubra antes se o mês vai apertar"
  };
  return labels[tier];
}

export function getPlanSummary(plan?: SaasPlanLike | null) {
  const tier = resolvePlanCommercialTier(plan?.id, plan?.tier);
  const summaries: Record<PlanCommercialTier, string> = {
    bronze: "Comece simples: monte sua base financeira e veja sua previsão sem conectar banco.",
    family: "Controle financeiro compartilhado para casal e família.",
    gold: "Conexão bancária automática, automações e inteligência avançada.",
    platinum: "Plano oculto e manual para clientes estratégicos, fundadores, parceiros e liberações especiais.",
    silver: "O Deniaros ajuda você a organizar contas, visualizar sua previsão financeira e tomar decisões antes do problema acontecer."
  };
  return summaries[tier];
}

export function getPlanFeatureLabels(plan?: SaasPlanLike | null) {
  const features = plan?.features ?? {};
  const labels: Record<string, string> = {
    accounts_wallets: "Contas e carteiras",
    agenda: "Agenda financeira",
    ai_deep_analysis: "Orientação inteligente inicial",
    emergency_mode: "Modo emergência",
    founder_release_channel: "Canal privado do fundador",
    family_workspace: "Workspace familiar",
    imports: "Importação CSV",
    joint_reports: "Relatórios consolidados",
    manual_entries: "Lançamentos manuais",
    open_finance: "Open Finance em desenvolvimento",
    reports_advanced: "Relatórios essenciais",
    reports_basic: "Relatórios essenciais",
    spending_simulator: "Simulador Posso gastar?",
    support_priority: "Suporte prioritário",
    team_controls: "Controles de equipe"
  };

  return Object.entries(features)
    .filter(([, value]) => value === true)
    .map(([key]) => labels[key] ?? key.replaceAll("_", " "));
}

export function getPlanLimitLabels(plan?: SaasPlanLike | null) {
  const limits = plan?.limits ?? {};
  const labels: Record<string, string> = {
    accounts: "contas",
    ai_messages: "mensagens de IA",
    seats: "usuários",
    transactions: "lançamentos",
    workspaces: "workspaces"
  };

  return Object.entries(limits)
    .slice(0, 5)
    .map(([key, value]) => `${value} ${labels[key] ?? key}`);
}

export function sortPlansByVisualTier<T extends SaasPlanLike>(plans: T[]) {
  const order: Record<PlanCommercialTier, number> = {
    bronze: 1,
    family: 4,
    gold: 3,
    platinum: 5,
    silver: 2
  };

  return [...plans].sort((a, b) => {
    const visualDiff = order[resolvePlanCommercialTier(a.id, a.tier)] - order[resolvePlanCommercialTier(b.id, b.tier)];
    return visualDiff || a.price_cents - b.price_cents;
  });
}

export function getPublicPlanCatalog<T extends SaasPlanLike>(plans: T[], currentPlanId?: string | null) {
  const selectedByTier = new Map<PlanCommercialTier, T>();
  const sortedPlans = sortPlansByVisualTier(plans);
  const currentPlan = sortedPlans.find((plan) => plan.id === currentPlanId);

  for (const plan of sortedPlans) {
    if (!plan.is_active || !plan.is_public) {
      continue;
    }

    const tier = resolvePlanCommercialTier(plan.id, plan.tier);
    if (!selectedByTier.has(tier)) {
      selectedByTier.set(tier, plan);
    }
  }

  if (currentPlan) {
    selectedByTier.set(resolvePlanCommercialTier(currentPlan.id, currentPlan.tier), currentPlan);
  }

  return sortPlansByVisualTier(Array.from(selectedByTier.values()));
}

export function translateSubscriptionStatus(status?: SaasSubscriptionLike["status"]) {
  const labels: Record<SaasSubscriptionLike["status"], string> = {
    active: "Ativa",
    canceled: "Cancelada",
    manual: "Manual",
    past_due: "Pagamento pendente",
    suspended: "Suspensa",
    trialing: "Trial"
  };
  return status ? labels[status] : "Sem assinatura";
}
