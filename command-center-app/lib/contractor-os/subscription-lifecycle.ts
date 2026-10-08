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
