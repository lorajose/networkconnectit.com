import test from "node:test";
import assert from "node:assert/strict";

import {
  createProTrial,
  hasEffectiveSubscriptionFeature,
  planSubscriptionChange,
  resolveEffectiveSubscriptionAccess,
  type SubscriptionRecord,
} from "../../lib/contractor-os/subscription-lifecycle";

const NOW = new Date("2026-10-09T12:00:00.000Z");

function subscription(
  plan: "PRO" | "BUSINESS",
  overrides: Partial<SubscriptionRecord> = {}
): SubscriptionRecord {
  return {
    organizationId: "org-1",
    provider: "stripe",
    providerCustomerId: "cus_1",
    providerSubscriptionId: `sub_${plan.toLowerCase()}`,
    plan,
    status: "ACTIVE",
    currentPeriodStart: "2026-10-01T00:00:00.000Z",
    currentPeriodEnd: "2026-11-01T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    verifiedAt: "2026-10-09T11:59:00.000Z",
    ...overrides,
  };
}

test("FREE organization without a trial stays FREE", () => {
  assert.deepEqual(resolveEffectiveSubscriptionAccess(null, null, NOW), {
    tier: "FREE",
    source: "NONE",
  });
});

test("one-time acquisition trial grants PRO for exactly 30 days", () => {
  const startsAt = new Date("2026-10-01T00:00:00.000Z");
  const trial = createProTrial("org-1", startsAt);

  assert.equal(trial.endsAt, "2026-10-31T00:00:00.000Z");
  assert.deepEqual(
    resolveEffectiveSubscriptionAccess(
      null,
      trial,
      new Date("2026-10-30T23:59:59.999Z")
    ),
    { tier: "PRO", source: "TRIAL" }
  );
});

test("expired PRO trial falls back to FREE without extending the trial", () => {
  const trial = createProTrial("org-1", new Date("2026-09-01T00:00:00.000Z"));

  assert.deepEqual(resolveEffectiveSubscriptionAccess(null, trial, NOW), {
    tier: "FREE",
    source: "EXPIRED_TRIAL",
  });
});

test("provider-verified paid PRO overrides an expired trial", () => {
  const expiredTrial = createProTrial(
    "org-1",
    new Date("2026-08-01T00:00:00.000Z")
  );

  assert.deepEqual(
    resolveEffectiveSubscriptionAccess(subscription("PRO"), expiredTrial, NOW),
    { tier: "PRO", source: "SUBSCRIPTION" }
  );
});

test("provider-verified BUSINESS overrides an active PRO trial", () => {
  const activeTrial = createProTrial(
    "org-1",
    new Date("2026-10-01T00:00:00.000Z")
  );

  assert.deepEqual(
    resolveEffectiveSubscriptionAccess(
      subscription("BUSINESS"),
      activeTrial,
      NOW
    ),
    { tier: "BUSINESS", source: "SUBSCRIPTION" }
  );
});

test("past-due or expired paid subscription cannot grant paid access", () => {
  assert.deepEqual(
    resolveEffectiveSubscriptionAccess(
      subscription("BUSINESS", { status: "PAST_DUE" }),
      null,
      NOW
    ),
    { tier: "FREE", source: "NONE" }
  );

  assert.deepEqual(
    resolveEffectiveSubscriptionAccess(
      subscription("PRO", { currentPeriodEnd: "2026-10-09T12:00:00.000Z" }),
      null,
      NOW
    ),
    { tier: "FREE", source: "NONE" }
  );
});

test("PRO trial grants PRO features but not BUSINESS-only features", () => {
  const trial = createProTrial(
    "org-1",
    new Date("2026-10-01T00:00:00.000Z")
  );

  assert.equal(
    hasEffectiveSubscriptionFeature(
      null,
      trial,
      "ADVANCED_DESIGN_STUDIO",
      NOW
    ),
    true
  );
  assert.equal(
    hasEffectiveSubscriptionFeature(null, trial, "DXF_WORKFLOWS", NOW),
    false
  );
  assert.equal(
    hasEffectiveSubscriptionFeature(null, trial, "TEAM_COLLABORATION", NOW),
    false
  );
});

test("BUSINESS subscription grants BUSINESS-only features", () => {
  const business = subscription("BUSINESS");

  assert.equal(
    hasEffectiveSubscriptionFeature(
      business,
      null,
      "TEAM_COLLABORATION",
      NOW
    ),
    true
  );
  assert.equal(
    hasEffectiveSubscriptionFeature(business, null, "DXF_WORKFLOWS", NOW),
    true
  );
});

test("commercial plan changes preserve paid-period policy", () => {
  assert.deepEqual(planSubscriptionChange("PRO", "BUSINESS"), {
    kind: "UPGRADE",
    fromPlan: "PRO",
    toPlan: "BUSINESS",
    effective: "IMMEDIATE",
  });
  assert.deepEqual(planSubscriptionChange("BUSINESS", "PRO"), {
    kind: "DOWNGRADE",
    fromPlan: "BUSINESS",
    toPlan: "PRO",
    effective: "PERIOD_END",
  });
  assert.deepEqual(planSubscriptionChange("PRO", null), {
    kind: "CANCEL",
    fromPlan: "PRO",
    effective: "PERIOD_END",
  });
});
