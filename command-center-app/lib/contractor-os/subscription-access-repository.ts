import { prisma } from "@/lib/db";

import type { CommercialActor } from "./commercial-access";
import { commercialReadScope } from "./commercial-access";
import {
  resolveEffectiveSubscriptionAccess,
  type EffectiveSubscriptionAccess,
  type SubscriptionRecord,
  type TrialRecord,
} from "./subscription-lifecycle";
import type { SubscriptionFeature } from "./subscription-plan";
import { subscriptionPlanHasFeature } from "./subscription-plan";
import { getOrganizationProTrial } from "./subscription-trial-repository";

type SubscriptionRow = {
  organizationId: string;
  provider: string;
  providerCustomerId: string;
  providerSubscriptionId: string;
  plan: "PRO" | "BUSINESS";
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE";
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  verifiedAt: Date;
};

export type SubscriptionExperienceSummary = {
  tier: "FREE" | "PRO" | "BUSINESS";
  source: "NONE" | "EXPIRED_TRIAL" | "TRIAL" | "SUBSCRIPTION";
  label: "Free" | "Pro Trial" | "Pro" | "Business";
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

function toSubscriptionRecord(row: SubscriptionRow): SubscriptionRecord {
  return {
    organizationId: row.organizationId,
    provider: row.provider,
    providerCustomerId: row.providerCustomerId,
    providerSubscriptionId: row.providerSubscriptionId,
    plan: row.plan,
    status: row.status,
    currentPeriodStart: row.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    verifiedAt: row.verifiedAt.toISOString(),
  };
}

async function getOrganizationSubscription(
  organizationId: string
): Promise<SubscriptionRecord | null> {
  if (!organizationId.trim()) {
    throw new Error("Subscription organization is required");
  }

  const row = await prisma.organizationSubscription.findUnique({
    where: { organizationId },
    select: {
      organizationId: true,
      provider: true,
      providerCustomerId: true,
      providerSubscriptionId: true,
      plan: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      verifiedAt: true,
    },
  });

  return row ? toSubscriptionRecord(row) : null;
}

async function getOrganizationCommercialState(
  organizationId: string,
  now = new Date()
): Promise<{
  access: EffectiveSubscriptionAccess;
  subscription: SubscriptionRecord | null;
  trial: TrialRecord | null;
}> {
  const [subscription, trial] = await Promise.all([
    getOrganizationSubscription(organizationId),
    getOrganizationProTrial(organizationId),
  ]);

  return {
    access: resolveEffectiveSubscriptionAccess(subscription, trial, now),
    subscription,
    trial,
  };
}

async function resolveOrganizationEffectiveSubscriptionAccess(
  organizationId: string,
  now = new Date()
): Promise<EffectiveSubscriptionAccess> {
  const state = await getOrganizationCommercialState(organizationId, now);
  return state.access;
}

export async function getEffectiveSubscriptionAccessForActor(
  actor: CommercialActor,
  requestedOrganizationId?: string,
  now = new Date()
): Promise<EffectiveSubscriptionAccess> {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  return resolveOrganizationEffectiveSubscriptionAccess(scope.organizationId, now);
}

export async function getSubscriptionExperienceSummaryForActor(
  actor: CommercialActor,
  requestedOrganizationId?: string,
  now = new Date()
): Promise<SubscriptionExperienceSummary> {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  const { access, subscription, trial } = await getOrganizationCommercialState(
    scope.organizationId,
    now
  );

  const activeTrial = access.source === "TRIAL" ? trial : null;
  const trialDaysRemaining = activeTrial
    ? Math.max(
        0,
        Math.ceil(
          (new Date(activeTrial.endsAt).getTime() - now.getTime()) /
            (24 * 60 * 60 * 1000)
        )
      )
    : null;

  const label =
    access.tier === "BUSINESS"
      ? "Business"
      : access.tier === "PRO"
        ? access.source === "TRIAL"
          ? "Pro Trial"
          : "Pro"
        : "Free";

  return {
    tier: access.tier,
    source: access.source,
    label,
    trialEndsAt: activeTrial?.endsAt ?? null,
    trialDaysRemaining,
    currentPeriodEnd:
      access.source === "SUBSCRIPTION" ? subscription?.currentPeriodEnd ?? null : null,
    cancelAtPeriodEnd:
      access.source === "SUBSCRIPTION" ? subscription?.cancelAtPeriodEnd ?? false : false,
  };
}

export async function requireSubscriptionFeatureForActor(
  actor: CommercialActor,
  feature: SubscriptionFeature,
  requestedOrganizationId?: string,
  now = new Date()
): Promise<EffectiveSubscriptionAccess> {
  const access = await getEffectiveSubscriptionAccessForActor(
    actor,
    requestedOrganizationId,
    now
  );

  if (
    access.tier === "FREE" ||
    !subscriptionPlanHasFeature(access.tier, feature)
  ) {
    throw new Error(`Subscription feature ${feature} is not entitled`);
  }

  return access;
}
