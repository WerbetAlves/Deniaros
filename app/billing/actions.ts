"use server";

import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { getPlanDisplayName, type SaasPlanLike } from "@/lib/saas-plans";
import { getAppUrl, getStripeClient, hasStripeSecretKey } from "@/lib/stripe";
import { getWorkspaceContext } from "@/lib/workspace-context";

const billingPath = "/billing";

type BillingPlanRow = SaasPlanLike;

type BillingSubscriptionRow = {
  id: string;
  plan_id: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

export async function requestPlanChange(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const planId = String(formData.get("planId") ?? "").trim();
  const planName = String(formData.get("planName") ?? "plano selecionado").trim();
  const currentPlan = String(formData.get("currentPlan") ?? "plano atual").trim();

  if (!planId) {
    redirect(`${billingPath}?error=${encodeURIComponent("Plano inválido para solicitação.")}`);
  }

  const { data: plan, error: planError } = await supabase
    .from("saas_plans")
    .select("id,name,tier,price_cents,billing_interval,is_public,is_active,limits,features,stripe_price_id,stripe_lookup_key")
    .eq("id", planId)
    .maybeSingle<BillingPlanRow>();

  if (planError || !plan) {
    redirect(`${billingPath}?error=${encodeURIComponent("Plano não encontrado no catálogo.")}`);
  }

  if (plan.billing_interval === "manual" || (!plan.stripe_price_id && !plan.stripe_lookup_key)) {
    await createBillingTicket({
      currentPlan,
      planId,
      planName,
      priority: planId === "platinum_private" ? "high" : "medium",
      supabase,
      userEmail: user.email ?? null,
      userId: user.id,
      workspaceId
    });

    redirect(
      `${billingPath}?success=${encodeURIComponent(
        "Solicitação enviada. O suporte vai revisar sua assinatura e responder pelo histórico de tickets."
      )}`
    );
  }

  if (!hasStripeSecretKey()) {
    redirect(
      `${billingPath}?error=${encodeURIComponent(
        "A Stripe ainda nao esta configurada no ambiente. Configure STRIPE_SECRET_KEY na Vercel para liberar o checkout."
      )}`
    );
  }

  const { data: subscription } = await supabase
    .from("saas_subscriptions")
    .select("id,plan_id,status,stripe_customer_id,stripe_subscription_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle<BillingSubscriptionRow>();

  const checkoutUrl = await createStripeCheckoutUrl({
    currentPlan,
    plan,
    stripeCustomerId: subscription?.stripe_customer_id ?? null,
    userEmail: user.email ?? null,
    userId: user.id,
    workspaceId
  });

  redirect(checkoutUrl);
}

export async function openBillingPortal() {
  const { supabase, user, workspaceId } = await getWorkspaceContext();

  if (!hasStripeSecretKey()) {
    redirect(
      `${billingPath}?error=${encodeURIComponent(
        "A Stripe ainda nao esta configurada no ambiente. Configure STRIPE_SECRET_KEY para abrir o portal de cobranca."
      )}`
    );
  }

  const { data: subscription, error } = await supabase
    .from("saas_subscriptions")
    .select("stripe_customer_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle<{ stripe_customer_id: string | null }>();

  if (error || !subscription?.stripe_customer_id) {
    redirect(
      `${billingPath}?error=${encodeURIComponent(
        "Sua assinatura ainda não está conectada à Stripe. Escolha um plano para abrir o checkout."
      )}`
    );
  }

  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${getAppUrl()}${billingPath}`
  });

  redirect(session.url);
}

async function createBillingTicket({
  currentPlan,
  planId,
  planName,
  priority,
  supabase,
  userEmail,
  userId,
  workspaceId
}: {
  currentPlan: string;
  planId: string;
  planName: string;
  priority: "medium" | "high";
  supabase: Awaited<ReturnType<typeof getWorkspaceContext>>["supabase"];
  userEmail: string | null;
  userId: string;
  workspaceId: string;
}) {
  const { error } = await supabase.from("saas_support_tickets").insert({
    area: "billing",
    description: `Solicitação de alteração de assinatura. Plano atual: ${currentPlan}. Plano desejado: ${planName} (${planId}).`,
    priority,
    requester_email: userEmail,
    requester_id: userId,
    status: "open",
    title: `Alterar assinatura para ${planName}`,
    workspace_id: workspaceId
  });

  if (error) {
    redirect(`${billingPath}?error=${encodeURIComponent(error.message)}`);
  }
}

async function createStripeCheckoutUrl({
  currentPlan,
  plan,
  stripeCustomerId,
  userEmail,
  userId,
  workspaceId
}: {
  currentPlan: string;
  plan: BillingPlanRow;
  stripeCustomerId: string | null;
  userEmail: string | null;
  userId: string;
  workspaceId: string;
}) {
  const stripe = getStripeClient();
  const appUrl = getAppUrl();
  const stripePriceId = await resolveStripePriceId(stripe, plan);
  const metadata = {
    currentPlan,
    planId: plan.id,
    planName: getPlanDisplayName(plan),
    seats: String(getPlanSeats(plan)),
    stripeLookupKey: plan.stripe_lookup_key ?? "",
    userId,
    workspaceId
  };
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    client_reference_id: workspaceId,
    line_items: [
      {
        price: stripePriceId,
        quantity: 1
      }
    ],
    metadata,
    mode: "subscription",
    subscription_data: {
      metadata
    },
    success_url: `${appUrl}${billingPath}?stripe=success&session_id={CHECKOUT_SESSION_ID}&success=${encodeURIComponent(
      "Pagamento confirmado pela Stripe. A assinatura sera sincronizada em instantes."
    )}`,
    cancel_url: `${appUrl}${billingPath}?error=${encodeURIComponent(
      "Checkout cancelado. Nenhuma cobrança foi concluída."
    )}`
  };

  if (stripeCustomerId) {
    sessionParams.customer = stripeCustomerId;
  } else if (userEmail) {
    sessionParams.customer_email = userEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    redirect(`${billingPath}?error=${encodeURIComponent("A Stripe não retornou uma URL de checkout.")}`);
  }

  return session.url;
}

async function resolveStripePriceId(stripe: Stripe, plan: BillingPlanRow) {
  if (plan.stripe_price_id) {
    return plan.stripe_price_id;
  }

  if (!plan.stripe_lookup_key) {
    redirect(
      `${billingPath}?error=${encodeURIComponent(
        "Este plano ainda não tem Price ID ou lookup key da Stripe configurado."
      )}`
    );
  }

  const prices = await stripe.prices.list({
    active: true,
    expand: ["data.product"],
    limit: 1,
    lookup_keys: [plan.stripe_lookup_key]
  });
  const price = prices.data[0];

  if (!price?.id) {
    redirect(
      `${billingPath}?error=${encodeURIComponent(
        `Nenhum preço ativo encontrado na Stripe para ${plan.stripe_lookup_key}.`
      )}`
    );
  }

  return price.id;
}

function getPlanSeats(plan: BillingPlanRow) {
  const seats = Number(plan.limits?.seats ?? 1);
  return Number.isFinite(seats) && seats > 0 ? seats : 1;
}
