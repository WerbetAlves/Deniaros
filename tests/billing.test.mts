import assert from "node:assert/strict";
import test from "node:test";
import {
  dateFromStripeTimestamp,
  getStripeSubscriptionPeriod,
  mapStripeSubscriptionStatus
} from "../lib/billing.ts";

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

test("extrai periodo vigente do primeiro item da assinatura", () => {
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
