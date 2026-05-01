import type Stripe from "stripe";

export type DeniarosSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "suspended"
  | "manual";

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): DeniarosSubscriptionStatus {
  if (status === "active") {
    return "active";
  }

  if (status === "trialing") {
    return "trialing";
  }

  if (status === "past_due") {
    return "past_due";
  }

  if (status === "canceled" || status === "incomplete_expired") {
    return "canceled";
  }

  return "suspended";
}

export function dateFromStripeTimestamp(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}

export function getStripeSubscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];

  return {
    currentPeriodEnd: dateFromStripeTimestamp(item?.current_period_end ?? null),
    currentPeriodStart: dateFromStripeTimestamp(item?.current_period_start ?? null)
  };
}
