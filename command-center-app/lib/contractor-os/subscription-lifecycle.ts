import type {
  SubscriptionFeature,
  SubscriptionPlan,
} from "./subscription-plan";
import { subscriptionPlanHasFeature } from "./subscription-plan";

export const SUBSCRIPTION_STATUSES = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
  "INCOMPLETE",
] as const;

export const PRO_TRIAL_DAYS = 30;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type SubscriptionRecord = {
  organizationId: string;
  provider: string;
  providerCustomerId: string;
  providerSubscriptionId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  verifiedAt: string;
};

export type TrialRecord = {
  organizationId: string;
  plan: "PRO";
  startsAt: string;
  endsAt: string;
};

export type EffectiveSubscriptionAccess =
  | { tier: "FREE"; source: "NONE" | "EXPIRED_TRIAL" }
  | { tier: "PRO"; source: "TRIAL" | "SUBSCRIPTION" }
  | { tier: "BUSINESS"; source: "SUBSCRIPTION" };

export type SubscriptionChange =
  | {
      kind: "UPGRADE";
      fromPlan: SubscriptionPlan;
      toPlan: SubscriptionPlan;
      effective: "IMMEDIATE";
    }
  | {
      kind: "DOWNGRADE";
      fromPlan: SubscriptionPlan;
      toPlan: SubscriptionPlan;
      effective: "PERIOD_END";
    }
  | {
      kind: "CANCEL";
      fromPlan: SubscriptionPlan;
      effective: "PERIOD_END";
    };

const PLAN_RANK: Readonly<Record<SubscriptionPlan, number>> = {
  PRO: 1,
  BUSINESS: 2,
};

function parseVerifiedDate(value: string, field: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Subscription ${field} is invalid`);
  }

  return date;
}

export function validateSubscriptionRecord(
  subscription: SubscriptionRecord
): SubscriptionRecord {
  if (!subscription.organizationId.trim()) {
    throw new Error("Subscription organization is required");
  }
  if (!subscription.provider.trim()) {
    throw new Error("Subscription provider is required");
  }
  if (!subscription.providerCustomerId.trim()) {
    throw new Error("Subscription provider customer id is required");
  }
  if (!subscription.providerSubscriptionId.trim()) {
    throw new Error("Subscription provider subscription id is required");
  }

  parseVerifiedDate(subscription.verifiedAt, "verified timestamp");

  if (subscription.currentPeriodStart) {
    parseVerifiedDate(subscription.currentPeriodStart, "period start");
  }

  if (subscription.currentPeriodEnd) {
    parseVerifiedDate(subscription.currentPeriodEnd, "period end");
  }

  return subscription;
}

export function createProTrial(
  organizationId: string,
  startsAt = new Date()
): TrialRecord {
  if (!organizationId.trim()) {
    throw new Error("Trial organization is required");
  }

  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + PRO_TRIAL_DAYS);

  return {
    organizationId,
    plan: "PRO",
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

export function isTrialActive(trial: TrialRecord | null, now = new Date()) {
  if (!trial) return false;

  const startsAt = parseVerifiedDate(trial.startsAt, "trial start");
  const endsAt = parseVerifiedDate(trial.endsAt, "trial end");

  return startsAt.getTime() <= now.getTime() && endsAt.getTime() > now.getTime();
}

/**
 * Resolves the server-owned commercial tier. Paid provider state wins over a
 * local trial. When no paid subscription is active, a current 30-day PRO
 * trial grants PRO. Expired trials fall back to FREE without deleting any
 * organization or project data.
 */
export function resolveEffectiveSubscriptionAccess(
  subscription: SubscriptionRecord | null,
  trial: TrialRecord | null,
  now = new Date()
): EffectiveSubscriptionAccess {
  if (subscription) {
    const verified = validateSubscriptionRecord(subscription);
    const statusGrantsAccess =
      verified.status === "ACTIVE" || verified.status === "TRIALING";
    const periodStillValid =
      !verified.currentPeriodEnd ||
      parseVerifiedDate(verified.currentPeriodEnd, "period end").getTime() >
        now.getTime();

    if (statusGrantsAccess && periodStillValid) {
      return {
        tier: verified.plan,
        source: "SUBSCRIPTION",
      } as EffectiveSubscriptionAccess;
    }
  }

  if (isTrialActive(trial, now)) {
    return { tier: "PRO", source: "TRIAL" };
  }

  return {
    tier: "FREE",
    source: trial ? "EXPIRED_TRIAL" : "NONE",
  };
}

/**
 * Subscription access is server-authoritative.
 *
 * Only provider-verified ACTIVE or TRIALING records can grant subscription
 * features. Browser return parameters, local storage, query strings and
 * client-provided plan names never grant access.
 */
export function hasSubscriptionFeature(
  subscriptionInput: SubscriptionRecord | null,
  feature: SubscriptionFeature,
  now = new Date()
) {
  if (!subscriptionInput) return false;

  const subscription = validateSubscriptionRecord(subscriptionInput);

  if (subscription.status !== "ACTIVE" && subscription.status !== "TRIALING") {
    return false;
  }

  if (subscription.currentPeriodEnd) {
    const periodEnd = parseVerifiedDate(
      subscription.currentPeriodEnd,
      "period end"
    );

    if (periodEnd.getTime() <= now.getTime()) {
      return false;
    }
  }

  return subscriptionPlanHasFeature(subscription.plan, feature);
}

export function hasEffectiveSubscriptionFeature(
  subscription: SubscriptionRecord | null,
  trial: TrialRecord | null,
  feature: SubscriptionFeature,
  now = new Date()
) {
  const access = resolveEffectiveSubscriptionAccess(subscription, trial, now);
  if (access.tier === "FREE") return false;
  return subscriptionPlanHasFeature(access.tier, feature);
}

/**
 * Commercial change policy for the first NCI-017 release.
 *
 * Upgrades take effect immediately after provider verification. Downgrades
 * and cancellations are scheduled for period end so already-paid access is
 * not silently removed. The provider webhook remains the authority that
 * persists the resulting plan/status.
 */
export function planSubscriptionChange(
  fromPlan: SubscriptionPlan,
  requestedPlan: SubscriptionPlan | null
): SubscriptionChange {
  if (requestedPlan === null) {
    return {
      kind: "CANCEL",
      fromPlan,
      effective: "PERIOD_END",
    };
  }

  if (requestedPlan === fromPlan) {
    throw new Error("Requested subscription plan is already active");
  }

  if (PLAN_RANK[requestedPlan] > PLAN_RANK[fromPlan]) {
    return {
      kind: "UPGRADE",
      fromPlan,
      toPlan: requestedPlan,
      effective: "IMMEDIATE",
    };
  }

  return {
    kind: "DOWNGRADE",
    fromPlan,
    toPlan: requestedPlan,
    effective: "PERIOD_END",
  };
}
