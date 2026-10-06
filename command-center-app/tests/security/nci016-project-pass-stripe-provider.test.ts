import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { StripeProjectPassProvider } from "../../lib/contractor-os/project-pass-stripe-provider";

const config = {
  secretKey: "sk_test_example",
  webhookSecret: "whsec_example",
};

test("NCI-016 Stripe checkout keeps price and tenant binding in server-owned request metadata", async () => {
  let body = "";
  const provider = new StripeProjectPassProvider(
    config,
    async (_input, init) => {
      body = String(init?.body ?? "");
      return new Response(
        JSON.stringify({
          id: "cs_test_project_pass",
          url: "https://checkout.stripe.com/c/pay/cs_test_project_pass",
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
  );

  const checkout = await provider.createCheckout({
    organizationId: "org-a",
    projectInstallationId: "project-a",
    product: "CCTV_DIAGRAM_EXPORT",
    amountCents: 1900,
    currency: "USD",
    successUrl: "https://app.example/projects/project-a/project-pass/return?projectPassStatus=success",
    cancelUrl: "https://app.example/projects/project-a/project-pass/return?projectPassStatus=cancelled",
  });

  const params = new URLSearchParams(body);
  assert.equal(params.get("mode"), "payment");
  assert.equal(params.get("line_items[0][price_data][unit_amount]"), "1900");
  assert.equal(params.get("metadata[organizationId]"), "org-a");
  assert.equal(params.get("metadata[projectInstallationId]"), "project-a");
  assert.equal(params.get("metadata[product]"), "CCTV_DIAGRAM_EXPORT");
  assert.equal(params.get("metadata[amountCents]"), "1900");
  assert.equal(checkout.providerPaymentId, "cs_test_project_pass");
});

test("NCI-016 Stripe webhook grants PAID only after a valid signature and paid Checkout Session", async () => {
  const now = 1_800_000_000_000;
  const timestamp = Math.floor(now / 1000);
  const rawBody = JSON.stringify({
    id: "evt_paid",
    type: "checkout.session.completed",
    created: timestamp,
    data: {
      object: {
        id: "cs_paid",
        amount_total: 1900,
        currency: "usd",
        payment_status: "paid",
        metadata: {
          organizationId: "org-a",
          projectInstallationId: "project-a",
          product: "CCTV_DIAGRAM_EXPORT",
          amountCents: "1900",
          currency: "USD",
        },
      },
    },
  });
  const signature = createHmac("sha256", config.webhookSecret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const provider = new StripeProjectPassProvider(config, fetch, () => now);
  const event = await provider.verifyWebhook({
    rawBody,
    signature: `t=${timestamp},v1=${signature}`,
    headers: {},
  });

  assert.equal(event.state, "PAID");
  assert.equal(event.providerEventId, "evt_paid");
  assert.equal(event.providerPaymentId, "cs_paid");
  assert.equal(event.amountCents, 1900);
  assert.equal(event.currency, "USD");
});

test("NCI-016 Stripe webhook rejects an invalid signature", async () => {
  const provider = new StripeProjectPassProvider(config, fetch, () => 1_800_000_000_000);
  await assert.rejects(
    provider.verifyWebhook({
      rawBody: "{}",
      signature: "t=1800000000,v1=deadbeef",
      headers: {},
    })
  );
});
