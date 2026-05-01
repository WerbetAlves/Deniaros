import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  dateFromStripeTimestamp,
  getStripeSubscriptionPeriod,
  mapStripeSubscriptionStatus
} from "@/lib/billing";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getStripeClient,
  getStripeWebhookSecret,
  hasStripeSecretKey,
  hasStripeWebhookSecret
} from "@/lib/stripe";

export const runtime = "nodejs";

type ExistingSubscriptionRow = {
  plan_id: string;
  user_id: string;
  workspace_id: string | null;
};

type PlanByPriceRow = {
  id: string;
};

export async function POST(request: Request) {
  if (!hasStripeSecretKey() || !hasStripeWebhookSecret()) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET." },
      { status: 500 }
    );
  }

  const stripe = getStripeClient();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      getStripeWebhookSecret()
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object);
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await syncStripeSubscription(event.data.object);
    }

    if (event.type === "invoice.payment_failed") {
      await markSubscriptionPastDue(event.data.object);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription" || !session.subscription) {
    return;
  }

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(readStripeId(session.subscription));

  await syncStripeSubscription(subscription, {
    customerId: session.customer ? readStripeId(session.customer) : null,
    planId: readMetadataValue(session.metadata, "planId"),
    userId: readMetadataValue(session.metadata, "userId"),
    workspaceId: readMetadataValue(session.metadata, "workspaceId")
  });
}

async function syncStripeSubscription(
  subscription: Stripe.Subscription,
  override?: {
    customerId?: string | null;
    planId?: string | null;
    userId?: string | null;
    workspaceId?: string | null;
  }
) {
  const supabase = createSupabaseAdminClient();
  const subscriptionId = subscription.id;
  const customerId = override?.customerId ?? readStripeId(subscription.customer);
  const price = subscription.items.data[0]?.price ?? null;
  const priceId = price?.id ?? null;
  const lookupKey = price?.lookup_key ?? null;
  const existing = await loadExistingSubscription(subscriptionId);
  const planId =
    override?.planId ??
    readMetadataValue(subscription.metadata, "planId") ??
    (priceId || lookupKey ? await loadPlanIdByStripePrice(priceId, lookupKey) : null) ??
    existing?.plan_id;
  const userId =
    override?.userId ?? readMetadataValue(subscription.metadata, "userId") ?? existing?.user_id;
  const workspaceId =
    override?.workspaceId ??
    readMetadataValue(subscription.metadata, "workspaceId") ??
    existing?.workspace_id;

  if (!planId || !userId || !workspaceId) {
    throw new Error("Stripe subscription is missing Deniaros metadata.");
  }

  const { currentPeriodEnd, currentPeriodStart } = getStripeSubscriptionPeriod(subscription);
  const seats = readPositiveInteger(subscription.metadata.seats, 1);

  const { error } = await supabase.from("saas_subscriptions").upsert(
    {
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_ends_at: currentPeriodEnd,
      current_period_starts_at: currentPeriodStart,
      plan_id: planId,
      seats,
      status: mapStripeSubscriptionStatus(subscription.status),
      stripe_customer_id: customerId,
      stripe_price_id: priceId,
      stripe_status: subscription.status,
      stripe_subscription_id: subscriptionId,
      trial_ends_at: dateFromStripeTimestamp(subscription.trial_end),
      updated_at: new Date().toISOString(),
      user_id: userId,
      workspace_id: workspaceId
    },
    { onConflict: "workspace_id" }
  );

  if (error) {
    throw error;
  }
}

async function markSubscriptionPastDue(invoice: Stripe.Invoice) {
  const subscriptionId = readInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("saas_subscriptions")
    .update({
      status: "past_due",
      stripe_status: "past_due",
      updated_at: new Date().toISOString()
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    throw error;
  }
}

async function loadExistingSubscription(subscriptionId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("saas_subscriptions")
    .select("workspace_id,user_id,plan_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle<ExistingSubscriptionRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

async function loadPlanIdByStripePrice(priceId: string | null, lookupKey: string | null) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("saas_plans").select("id");

  if (priceId && lookupKey) {
    query = query.or(`stripe_price_id.eq.${priceId},stripe_lookup_key.eq.${lookupKey}`);
  } else if (priceId) {
    query = query.eq("stripe_price_id", priceId);
  } else if (lookupKey) {
    query = query.eq("stripe_lookup_key", lookupKey);
  }

  const { data, error } = await query.maybeSingle<PlanByPriceRow>();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

function readMetadataValue(
  metadata: Stripe.Metadata | null | undefined,
  key: string
) {
  const value = metadata?.[key];
  return value && value.trim() ? value : null;
}

function readStripeId(value: string | { id: string } | null) {
  if (!value) {
    return "";
  }

  return typeof value === "string" ? value : value.id;
}

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const parentSubscription = invoice.parent?.subscription_details?.subscription;

  if (parentSubscription) {
    return readStripeId(parentSubscription);
  }

  return null;
}
