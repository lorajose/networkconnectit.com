const failures = [];

const required = [
  "STRIPE_SECRET_KEY",
  "STRIPE_SUBSCRIPTION_WEBHOOK_SECRET",
  "STRIPE_PRO_PRICE_ID",
  "STRIPE_BUSINESS_PRICE_ID",
];

for (const name of required) {
  const value = (process.env[name] ?? "").trim();
  if (!value) failures.push(`${name} is required for NCI-017 Stripe QA`);
  else if (/replace-with|changeme|example|placeholder/i.test(value)) failures.push(`${name} must not be a placeholder`);
}

const secretKey = (process.env.STRIPE_SECRET_KEY ?? "").trim();
if (secretKey && !secretKey.startsWith("sk_test_")) {
  failures.push("STRIPE_SECRET_KEY must be a Stripe Test Mode secret key (sk_test_) for QA");
}

const webhookSecret = (process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET ?? "").trim();
if (webhookSecret && !webhookSecret.startsWith("whsec_")) {
  failures.push("STRIPE_SUBSCRIPTION_WEBHOOK_SECRET must use Stripe webhook signing-secret format (whsec_)");
}

for (const name of ["STRIPE_PRO_PRICE_ID", "STRIPE_BUSINESS_PRICE_ID"]) {
  const value = (process.env[name] ?? "").trim();
  if (value && !value.startsWith("price_")) failures.push(`${name} must use a Stripe Price ID (price_)`);
}

const proPrice = (process.env.STRIPE_PRO_PRICE_ID ?? "").trim();
const businessPrice = (process.env.STRIPE_BUSINESS_PRICE_ID ?? "").trim();
if (proPrice && businessPrice && proPrice === businessPrice) {
  failures.push("STRIPE_PRO_PRICE_ID and STRIPE_BUSINESS_PRICE_ID must be different prices");
}

if ((process.env.NCI_RUNTIME_ENV ?? "").trim().toLowerCase() !== "qa") {
  failures.push("NCI_RUNTIME_ENV must be qa for NCI-017 Stripe QA");
}
if ((process.env.NODE_ENV ?? "").trim().toLowerCase() !== "production") {
  failures.push("NODE_ENV must be production for the QA standalone runtime");
}

if (failures.length) {
  for (const failure of failures) console.error(`BLOCKER: ${failure}`);
  process.exit(1);
}

console.log("NCI-017 Stripe Test Mode QA gate checks passed.");
