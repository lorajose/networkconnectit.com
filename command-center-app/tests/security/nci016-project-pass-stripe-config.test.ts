import test from "node:test";
import assert from "node:assert/strict";

import { resolveProjectPassStripeConfig } from "../../lib/contractor-os/project-pass-stripe-config";

test("NCI-016 Stripe configuration fails closed when secrets are absent", () => {
  const result = resolveProjectPassStripeConfig({});

  assert.deepEqual(result, {
    configured: false,
    reason: "STRIPE_NOT_CONFIGURED",
  });
});

test("NCI-016 Stripe configuration requires both API and webhook secrets", () => {
  assert.equal(
    resolveProjectPassStripeConfig({ STRIPE_SECRET_KEY: "sk_test_example" }).configured,
    false
  );
  assert.equal(
    resolveProjectPassStripeConfig({
      STRIPE_PROJECT_PASS_WEBHOOK_SECRET: "whsec_example",
    }).configured,
    false
  );
});

test("NCI-016 Stripe configuration remains server-owned and trims values", () => {
  const result = resolveProjectPassStripeConfig({
    STRIPE_SECRET_KEY: "  sk_test_example  ",
    STRIPE_PROJECT_PASS_WEBHOOK_SECRET: "  whsec_example  ",
  });

  assert.deepEqual(result, {
    configured: true,
    config: {
      secretKey: "sk_test_example",
      webhookSecret: "whsec_example",
    },
  });
});
