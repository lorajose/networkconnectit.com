import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { StripeSubscriptionProvider } from "../../lib/contractor-os/subscription-stripe-provider";
import type { SubscriptionStripeConfig } from "../../lib/contractor-os/subscription-stripe-config";

const NOW_MS = Date.parse("2026-10-09T12:00:00.000Z");
const WEBHOOK_SECRET = "whsec_test_subscription_boundary";

const config: SubscriptionStripeConfig = {
  secretKey: "sk_test_subscription_boundary",
  webhookSecret: WEBHOOK_SECRET,
  priceIds: {
    PRO: "price_Pro123",
    BUSINESS: "price_Business456",
  },
};

function signature(rawBody: string, timestamp = Math.floor(NOW_MS / 1000)) {
  const digest = createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

function subscriptionObject(plan = "PRO", priceId = "price_Pro123") {
  return {
    id: "sub_123",
    customer: "cus_123",
    status: "active",
    current_period_start: 1790812800,
    current_period_end: 1793491200,
    cancel_at_period_end: false,
    metadata: {
      organizationId: "org-1",
      plan,
    },
    items: {
      data: [{ price: { id: priceId } }],
    },
  };
}

function subscriptionEvent(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: "evt_subscription_1",
    type: "customer.subscription.updated",
    created: Math.floor(NOW_MS / 1000),
    data: { object: subscriptionObject() },
    ...overrides,
  });
}

test("subscription checkout uses only the server-owned Stripe price mapping", async () => {
  let requestBody = "";
  const provider = new StripeSubscriptionProvider(
    config,
    async (_input, init) => {
      requestBody = String(init?.body ?? "");
      return new Response(
        JSON.stringify({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/c/pay/cs_test_123",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    },
    () => NOW_MS
  );

  await provider.createCheckout({
    organizationId: "org-1",
    plan: "PRO",
    successUrl: "https://example.test/billing?success=1",
    cancelUrl: "https://example.test/billing?cancel=1",
  });

  const params = new URLSearchParams(requestBody);
  assert.equal(params.get("mode"), "subscription");
  assert.equal(params.get("line_items[0][price]"), "price_Pro123");
  assert.equal(params.get("metadata[organizationId]"), "org-1");
  assert.equal(params.get("subscription_data[metadata][organizationId]"), "org-1");
  assert.equal(params.get("subscription_data[metadata][plan]"), "PRO");
});

test("resubscribe checkout reuses only the persisted Stripe customer", async () => {
  let requestBody = "";
  const provider = new StripeSubscriptionProvider(
    config,
    async (_input, init) => {
      requestBody = String(init?.body ?? "");
      return new Response(
        JSON.stringify({
          id: "cs_test_resubscribe",
          url: "https://checkout.stripe.com/c/pay/cs_test_resubscribe",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    },
    () => NOW_MS
  );

  await provider.createCheckout({
    organizationId: "org-1",
    plan: "BUSINESS",
    successUrl: "https://example.test/billing?success=1",
    cancelUrl: "https://example.test/billing?cancel=1",
    providerCustomerId: "cus_persisted_123",
  });

  const params = new URLSearchParams(requestBody);
  assert.equal(params.get("customer"), "cus_persisted_123");
  assert.equal(params.get("line_items[0][price]"), "price_Business456");
  assert.equal(params.get("metadata[organizationId]"), "org-1");
});

test("new subscription checkout does not invent a Stripe customer", async () => {
  let requestBody = "";
  const provider = new StripeSubscriptionProvider(
    config,
    async (_input, init) => {
      requestBody = String(init?.body ?? "");
      return new Response(
        JSON.stringify({
          id: "cs_test_new",
          url: "https://checkout.stripe.com/c/pay/cs_test_new",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    },
    () => NOW_MS
  );

  await provider.createCheckout({
    organizationId: "org-1",
    plan: "PRO",
    successUrl: "https://example.test/billing?success=1",
    cancelUrl: "https://example.test/billing?cancel=1",
  });

  const params = new URLSearchParams(requestBody);
  assert.equal(params.has("customer"), false);
});

test("verified Stripe subscription lifecycle event derives PRO from its trusted price", () => {
  const provider = new StripeSubscriptionProvider(config, fetch, () => NOW_MS);
  const rawBody = subscriptionEvent();

  const event = provider.verifyWebhook(rawBody, signature(rawBody));

  assert.equal(event.provider, "stripe");
  assert.equal(event.providerEventId, "evt_subscription_1");
  assert.equal(event.organizationId, "org-1");
  assert.equal(event.plan, "PRO");
  assert.equal(event.status, "ACTIVE");
  assert.equal(event.providerSubscriptionId, "sub_123");
  assert.equal(event.providerCustomerId, "cus_123");
});

test("trusted BUSINESS price derives BUSINESS access", () => {
  const provider = new StripeSubscriptionProvider(config, fetch, () => NOW_MS);
  const rawBody = subscriptionEvent({
    data: { object: subscriptionObject("BUSINESS", "price_Business456") },
  });

  const event = provider.verifyWebhook(rawBody, signature(rawBody));
  assert.equal(event.plan, "BUSINESS");
});

test("untrusted Stripe subscription price is rejected", () => {
  const provider = new StripeSubscriptionProvider(config, fetch, () => NOW_MS);
  const rawBody = subscriptionEvent({
    data: { object: subscriptionObject("PRO", "price_AttackerControlled") },
  });

  assert.throws(
    () => provider.verifyWebhook(rawBody, signature(rawBody)),
    /untrusted price id/
  );
});

test("metadata cannot elevate a PRO price to BUSINESS", () => {
  const provider = new StripeSubscriptionProvider(config, fetch, () => NOW_MS);
  const rawBody = subscriptionEvent({
    data: { object: subscriptionObject("BUSINESS", "price_Pro123") },
  });

  assert.throws(
    () => provider.verifyWebhook(rawBody, signature(rawBody)),
    /metadata does not match its trusted price/
  );
});

test("multiple subscription items are rejected instead of guessing entitlement", () => {
  const provider = new StripeSubscriptionProvider(config, fetch, () => NOW_MS);
  const object = subscriptionObject();
  object.items.data.push({ price: { id: "price_Business456" } });
  const rawBody = subscriptionEvent({ data: { object } });

  assert.throws(
    () => provider.verifyWebhook(rawBody, signature(rawBody)),
    /exactly one plan item/
  );
});

test("invalid Stripe webhook signature is rejected before lifecycle data is trusted", () => {
  const provider = new StripeSubscriptionProvider(config, fetch, () => NOW_MS);
  const rawBody = subscriptionEvent();

  assert.throws(
    () => provider.verifyWebhook(rawBody, `t=${Math.floor(NOW_MS / 1000)},v1=bad`),
    /signature is invalid/
  );
});

test("stale Stripe webhook signature is rejected", () => {
  const provider = new StripeSubscriptionProvider(config, fetch, () => NOW_MS);
  const rawBody = subscriptionEvent();
  const staleTimestamp = Math.floor(NOW_MS / 1000) - 301;

  assert.throws(
    () => provider.verifyWebhook(rawBody, signature(rawBody, staleTimestamp)),
    /outside the allowed tolerance/
  );
});

test("deleted Stripe subscription always normalizes to CANCELED", () => {
  const provider = new StripeSubscriptionProvider(config, fetch, () => NOW_MS);
  const rawBody = subscriptionEvent({
    type: "customer.subscription.deleted",
    data: { object: subscriptionObject("BUSINESS", "price_Business456") },
  });

  const event = provider.verifyWebhook(rawBody, signature(rawBody));
  assert.equal(event.status, "CANCELED");
  assert.equal(event.plan, "BUSINESS");
});

test("unsupported subscription plan metadata is rejected", () => {
  const provider = new StripeSubscriptionProvider(config, fetch, () => NOW_MS);
  const rawBody = subscriptionEvent({
    data: { object: subscriptionObject("ENTERPRISE", "price_Pro123") },
  });

  assert.throws(
    () => provider.verifyWebhook(rawBody, signature(rawBody)),
    /Unsupported subscription plan/
  );
});
