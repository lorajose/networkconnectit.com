import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { StripeProjectPassProvider } from "../../lib/contractor-os/project-pass-stripe-provider";

const config = {
  secretKey: "sk_test_example",
  webhookSecret: "whsec_example",
};

function signStripeBody(rawBody: string, timestamp: number) {
  const signature = createHmac("sha256", config.webhookSecret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

function refundEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_refund",
    type: "charge.refunded",
    created: 1_800_000_000,
    data: {
      object: {
        id: "ch_1",
        amount: 1900,
        amount_refunded: 1900,
        currency: "usd",
        refunded: true,
        payment_intent: "pi_1",
        ...overrides,
      },
    },
  };
}

function checkoutSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_refund",
    amount_total: 1900,
    currency: "usd",
    payment_status: "paid",
    payment_intent: "pi_1",
    metadata: {
      organizationId: "org-a",
      projectInstallationId: "project-a",
      product: "CCTV_DIAGRAM_EXPORT",
      amountCents: "1900",
      currency: "USD",
    },
    ...overrides,
  };
}

test("NCI-016 full Stripe refund resolves the original Checkout Session before revoking", async () => {
  const now = 1_800_000_000_000;
  const rawBody = JSON.stringify(refundEvent());
  let lookupUrl = "";

  const provider = new StripeProjectPassProvider(
    config,
    async (input, init) => {
      lookupUrl = input;
      assert.equal(init?.method, "GET");
      assert.equal(init?.headers && (init.headers as Record<string, string>).Authorization, "Bearer sk_test_example");
      return new Response(JSON.stringify({ data: [checkoutSession()] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
    () => now
  );

  const event = await provider.verifyWebhook({
    rawBody,
    signature: signStripeBody(rawBody, Math.floor(now / 1000)),
    headers: {},
  });

  assert.match(lookupUrl, /payment_intent=pi_1/);
  assert.equal(event.state, "REFUNDED");
  assert.equal(event.providerPaymentId, "cs_refund");
  assert.equal(event.organizationId, "org-a");
  assert.equal(event.projectInstallationId, "project-a");
  assert.equal(event.product, "CCTV_DIAGRAM_EXPORT");
  assert.equal(event.amountCents, 1900);
  assert.equal(event.currency, "USD");
});

test("NCI-016 partial Stripe refund never revokes Project Pass", async () => {
  const now = 1_800_000_000_000;
  const rawBody = JSON.stringify(
    refundEvent({ amount_refunded: 900, refunded: false })
  );
  let lookupCalled = false;

  const provider = new StripeProjectPassProvider(
    config,
    async () => {
      lookupCalled = true;
      throw new Error("lookup must not run");
    },
    () => now
  );

  await assert.rejects(
    provider.verifyWebhook({
      rawBody,
      signature: signStripeBody(rawBody, Math.floor(now / 1000)),
      headers: {},
    }),
    /Partial Stripe refund/
  );
  assert.equal(lookupCalled, false);
});

test("NCI-016 refund fails closed if Stripe resolves zero or multiple Checkout Sessions", async () => {
  const now = 1_800_000_000_000;
  const rawBody = JSON.stringify(refundEvent());

  for (const data of [[], [checkoutSession(), checkoutSession({ id: "cs_other" })]]) {
    const provider = new StripeProjectPassProvider(
      config,
      async () =>
        new Response(JSON.stringify({ data }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      () => now
    );

    await assert.rejects(
      provider.verifyWebhook({
        rawBody,
        signature: signStripeBody(rawBody, Math.floor(now / 1000)),
        headers: {},
      }),
      /exactly one Checkout Session/
    );
  }
});

test("NCI-016 refund rejects PaymentIntent, amount, currency or metadata mismatches", async () => {
  const now = 1_800_000_000_000;
  const rawBody = JSON.stringify(refundEvent());

  const badSessions = [
    checkoutSession({ payment_intent: "pi_other" }),
    checkoutSession({ amount_total: 900 }),
    checkoutSession({ currency: "eur" }),
    checkoutSession({
      metadata: {
        organizationId: "org-a",
        projectInstallationId: "project-a",
        product: "CCTV_DIAGRAM_EXPORT",
        amountCents: "900",
        currency: "USD",
      },
    }),
  ];

  for (const session of badSessions) {
    const provider = new StripeProjectPassProvider(
      config,
      async () =>
        new Response(JSON.stringify({ data: [session] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      () => now
    );

    await assert.rejects(
      provider.verifyWebhook({
        rawBody,
        signature: signStripeBody(rawBody, Math.floor(now / 1000)),
        headers: {},
      })
    );
  }
});
