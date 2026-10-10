import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const base = {
  ...process.env,
  NCI_RUNTIME_ENV: "qa",
  NODE_ENV: "production",
  STRIPE_SECRET_KEY: "sk_test_qa_nci017",
  STRIPE_SUBSCRIPTION_WEBHOOK_SECRET: "whsec_qa_nci017",
  STRIPE_PRO_PRICE_ID: "price_qa_pro",
  STRIPE_BUSINESS_PRICE_ID: "price_qa_business",
};

const gate = (overrides = {}) =>
  spawnSync(process.execPath, ["scripts/nci017-stripe-qa-gate.mjs"], {
    cwd: process.cwd(),
    env: { ...base, ...overrides },
    encoding: "utf8",
  });

const valid = gate();
assert.equal(valid.status, 0, valid.stderr);

for (const [overrides, pattern] of [
  [{ STRIPE_SECRET_KEY: "" }, /STRIPE_SECRET_KEY is required/],
  [{ STRIPE_SECRET_KEY: "sk_live_accidental" }, /must be a Stripe Test Mode secret key/],
  [{ STRIPE_SECRET_KEY: "replace-with-test-key" }, /must not be a placeholder/],
  [{ STRIPE_SUBSCRIPTION_WEBHOOK_SECRET: "bad_webhook_secret" }, /must use Stripe webhook signing-secret format/],
  [{ STRIPE_PRO_PRICE_ID: "prod_pro" }, /STRIPE_PRO_PRICE_ID must use a Stripe Price ID/],
  [{ STRIPE_BUSINESS_PRICE_ID: "prod_business" }, /STRIPE_BUSINESS_PRICE_ID must use a Stripe Price ID/],
  [{ STRIPE_BUSINESS_PRICE_ID: "price_qa_pro" }, /must be different prices/],
  [{ NCI_RUNTIME_ENV: "production" }, /NCI_RUNTIME_ENV must be qa/],
  [{ NODE_ENV: "development" }, /NODE_ENV must be production/],
]) {
  const result = gate(overrides);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, pattern);
}

console.log("PASS NCI-017 Stripe QA gate: test-mode credentials, distinct trusted prices, and QA runtime identity.");
