import assert from "node:assert/strict";
import test from "node:test";
import {
  dateFromStripeTimestamp,
  getStripeSubscriptionPeriod,
  mapStripeSubscriptionStatus,
  readInvoiceSubscriptionId,
  readPositiveInteger,
  readStripeId,
  readStripeMetadataValue
} from "../lib/billing.ts";
import {
  getPlanDisplayNameFromId,
  getPlanFeatureLabels,
  getPlanLimitLabels,
  getPublicPlanCatalog,
  resolvePlanCommercialTier,
  resolvePlanVisualTier,
  type SaasPlanLike
} from "../lib/saas-plans.ts";

test("mapeia status da Stripe para estados internos de assinatura", () => {
  assert.equal(mapStripeSubscriptionStatus("active"), "active");
  assert.equal(mapStripeSubscriptionStatus("trialing"), "trialing");
  assert.equal(mapStripeSubscriptionStatus("past_due"), "past_due");
  assert.equal(mapStripeSubscriptionStatus("canceled"), "canceled");
  assert.equal(mapStripeSubscriptionStatus("incomplete_expired"), "canceled");
  assert.equal(mapStripeSubscriptionStatus("unpaid"), "suspended");
  assert.equal(mapStripeSubscriptionStatus("incomplete"), "suspended");
});

test("normaliza timestamps da Stripe em ISO ou nulo", () => {
  assert.equal(dateFromStripeTimestamp(1_800_000_000), "2027-01-15T08:00:00.000Z");
  assert.equal(dateFromStripeTimestamp(null), null);
  assert.equal(dateFromStripeTimestamp(undefined), null);
});

test("extrai período vigente do primeiro item da assinatura", () => {
  const subscription = {
    items: {
      data: [
        {
          current_period_end: 1_800_086_400,
          current_period_start: 1_797_408_000
        }
      ]
    }
  };

  assert.deepEqual(getStripeSubscriptionPeriod(subscription as never), {
    currentPeriodEnd: "2027-01-16T08:00:00.000Z",
    currentPeriodStart: "2026-12-16T08:00:00.000Z"
  });
});

test("lê metadados e identificadores exigidos pelo webhook da Stripe", () => {
  assert.equal(readStripeMetadataValue({ planId: "family" }, "planId"), "family");
  assert.equal(readStripeMetadataValue({ planId: "   " }, "planId"), null);
  assert.equal(readStripeMetadataValue(null, "planId"), null);
  assert.equal(readStripeId("sub_123"), "sub_123");
  assert.equal(readStripeId({ id: "cus_123" }), "cus_123");
  assert.equal(readStripeId(null), "");
  assert.equal(readPositiveInteger("2", 1), 2);
  assert.equal(readPositiveInteger("0", 1), 1);
  assert.equal(readPositiveInteger("abc", 1), 1);
});

test("lê assinatura de invoice.payment_failed no formato atual da Stripe", () => {
  const invoice = {
    parent: {
      subscription_details: {
        subscription: "sub_failed_123"
      }
    }
  };

  assert.equal(readInvoiceSubscriptionId(invoice as never), "sub_failed_123");
});

test("mantém contrato comercial do plano Controle e roadmap", () => {
  const plans: SaasPlanLike[] = [
    buildPlan({ id: "free", isActive: false, isPublic: false, price: 0, tier: "bronze" }),
    buildPlan({
      features: {
        accounts_wallets: true,
        agenda: true,
        ai_deep_analysis: true,
        emergency_mode: true,
        imports: true,
        manual_entries: true,
        reports_basic: true,
        spending_simulator: true
      },
      id: "pro",
      isPublic: true,
      limits: { accounts: 20, seats: 1 },
      lookupKey: "deniaros_controle_monthly",
      price: 2900,
      tier: "pro"
    }),
    buildPlan({
      id: "business_lite",
      isPublic: false,
      lookupKey: null,
      price: 0,
      tier: "business"
    }),
    buildPlan({
      features: { family_workspace: true, joint_reports: true },
      id: "family",
      isPublic: false,
      limits: { seats: 2 },
      lookupKey: null,
      price: 0,
      tier: "family"
    }),
    buildPlan({
      features: { founder_release_channel: true },
      id: "platinum_private",
      interval: "manual",
      isPublic: false,
      limits: { seats: 1 },
      lookupKey: null,
      price: 0,
      tier: "platinum"
    })
  ];

  assert.equal(resolvePlanVisualTier("platinum_private", "platinum"), "platinum");
  assert.equal(resolvePlanVisualTier("pro", "pro"), "silver");
  assert.equal(resolvePlanCommercialTier("business_lite", "business"), "gold");
  assert.equal(resolvePlanCommercialTier("family", "family"), "family");
  assert.equal(getPlanDisplayNameFromId("pro", "pro"), "Deniaros Controle");
  assert.equal(getPlanDisplayNameFromId("family", "family"), "Deniaros Família");
  assert.deepEqual(getPlanLimitLabels(plans[3]), ["2 usuários"]);
  assert.deepEqual(getPlanFeatureLabels(plans[3]), ["Workspace familiar", "Relatórios consolidados"]);
  assert.deepEqual(getPlanFeatureLabels(plans[1]), [
    "Contas e carteiras",
    "Agenda financeira",
    "Orientação inteligente inicial",
    "Modo emergência",
    "Importação CSV",
    "Lançamentos manuais",
    "Relatórios essenciais",
    "Simulador Posso gastar?"
  ]);

  const publicCatalog = getPublicPlanCatalog(plans);
  assert.deepEqual(
    publicCatalog.map((plan) => plan.id),
    ["pro"]
  );

  const catalogWithFamilyCurrentPlan = getPublicPlanCatalog(plans, "family");
  assert.deepEqual(
    catalogWithFamilyCurrentPlan.map((plan) => plan.id),
    ["pro", "family"]
  );
});

function buildPlan({
  features = {},
  id,
  interval = "month",
  isActive = true,
  isPublic,
  limits = {},
  lookupKey = null,
  price,
  tier
}: {
  features?: Record<string, unknown>;
  id: string;
  interval?: SaasPlanLike["billing_interval"];
  isActive?: boolean;
  isPublic: boolean;
  limits?: Record<string, unknown>;
  lookupKey?: string | null;
  price: number;
  tier: string;
}): SaasPlanLike {
  return {
    billing_interval: interval,
    features,
    id,
    is_active: isActive,
    is_public: isPublic,
    limits,
    name: id,
    price_cents: price,
    stripe_lookup_key: lookupKey,
    stripe_price_id: null,
    stripe_product_id: null,
    tier
  };
}
