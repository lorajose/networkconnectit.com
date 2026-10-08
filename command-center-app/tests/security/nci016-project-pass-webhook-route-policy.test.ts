import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const routePath = path.resolve(
  process.cwd(),
  "app/api/project-pass/webhook/stripe/route.ts"
);
const routeSource = fs.readFileSync(routePath, "utf8");

test("NCI-016 Stripe webhook preserves raw-body signature verification boundary", () => {
  const rawBodyIndex = routeSource.indexOf("await request.text()");
  const signatureIndex = routeSource.indexOf('request.headers.get("stripe-signature")');
  const processIndex = routeSource.indexOf("processProjectPassWebhook(");

  assert.ok(rawBodyIndex >= 0, "Stripe webhook must read the unmodified raw body");
  assert.ok(signatureIndex > rawBodyIndex, "signature must be captured from Stripe-Signature");
  assert.ok(processIndex > signatureIndex, "verified provider processing must receive raw body and signature");
  assert.doesNotMatch(routeSource, /request\.json\(/);
});

test("NCI-016 Stripe webhook fails closed when provider is not configured", () => {
  assert.match(routeSource, /resolveProjectPassPaymentProvider\(\)/);
  assert.match(routeSource, /providerResolution\.provider\.name !== "stripe"/);
  assert.match(routeSource, /PROVIDER_NOT_CONFIGURED/);
  assert.match(routeSource, /status:\s*503/);
});

test("NCI-016 Stripe webhook responses never become entitlement authority in a browser cache", () => {
  const privateNoStoreMatches = routeSource.match(/"Cache-Control":\s*"private, no-store"/g) ?? [];

  assert.ok(privateNoStoreMatches.length >= 3, "all webhook response paths must be private/no-store");
  assert.match(routeSource, /\{ received: true \}/);
  assert.match(routeSource, /status:\s*200/);
  assert.match(routeSource, /\{ received: false \}/);
  assert.match(routeSource, /status:\s*400/);
});

test("NCI-016 Stripe webhook intentionally uses provider authenticity instead of user-session auth", () => {
  assert.doesNotMatch(routeSource, /requireApiRoles|requireRoles|getServerSession/);
  assert.match(routeSource, /Stripe-Signature/);
  assert.match(routeSource, /Authenticity is[\s\S]*unmodified raw request[\s\S]*persistence/);
});
