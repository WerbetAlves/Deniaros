import Stripe from "stripe";

export function hasStripeSecretKey() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function hasStripeWebhookSecret() {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required to use Stripe billing.");
  }

  return new Stripe(secretKey);
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
}

export function getStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is required to receive Stripe webhooks.");
  }

  return secret;
}
