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
  pendingPlan: "PRO" | "BUSINESS" | null;
  providerScheduleId: string | null;
  pendingPlanEffectiveAt: Date | null;
  verifiedAt: Date;
};

type StoredSubscriptionState = {
  record: SubscriptionRecord;
  pendingPlan: "PRO" | "BUSINESS" | null;
  providerScheduleId: string | null;
  pendingPlanEffectiveAt: string | null;
};

export type SubscriptionExperienceSummary = {
  tier: "FREE" | "PRO" | "BUSINESS";
  source: "NONE" | "EXPIRED_TRIAL" | "TRIAL" | "SUBSCRIPTION";
  label: "Free" | "Pro Trial" | "Pro" | "Business";
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  pendingPlan: "PRO" | "BUSINESS" | null;
  pendingPlanEffectiveAt: string | null;
  hasScheduledPlanChange: boolean;
};

function toStoredSubscriptionState(row: SubscriptionRow): StoredSubscriptionState {
  return {
    record: {
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
    },
    pendingPlan: row.pendingPlan,
    providerScheduleId: row.providerScheduleId,
    pendingPlanEffectiveAt: row.pendingPlanEffectiveAt?.toISOString() ?? null,
  };
}

async function getOrganizationSubscription(
  organizationId: string
): Promise<StoredSubscriptionState | null> {
  if (!organizationId.trim()) throw new Error("Subscription organization is required");

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
      pendingPlan: true,
      providerScheduleId: true,
      pendingPlanEffectiveAt: true,
      verifiedAt: true,
    },
  });

  return row ? toStoredSubscriptionState(row) : null;
}

async function getOrganizationCommercialState(
  organizationId: string,
  now = new Date()
): Promise<{
  access: EffectiveSubscriptionAccess;
  subscription: StoredSubscriptionState | null;
  trial: TrialRecord | null;
}> {
  const [subscription, trial] = await Promise.all([
    getOrganizationSubscription(organizationId),
    getOrganizationProTrial(organizationId),
  ]);

  return {
    access: resolveEffectiveSubscriptionAccess(subscription?.record ?? null, trial, now),
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

  const paid = access.source === "SUBSCRIPTION" ? subscription : null;
  const hasScheduledPlanChange = Boolean(
    paid?.pendingPlan && paid.providerScheduleId && paid.pendingPlanEffectiveAt
  );

  return {
    tier: access.tier,
    source: access.source,
    label,
    trialEndsAt: activeTrial?.endsAt ?? null,
    trialDaysRemaining,
    currentPeriodEnd: paid?.record.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: paid?.record.cancelAtPeriodEnd ?? false,
    pendingPlan: hasScheduledPlanChange ? paid?.pendingPlan ?? null : null,
    pendingPlanEffectiveAt: hasScheduledPlanChange
      ? paid?.pendingPlanEffectiveAt ?? null
      : null,
    hasScheduledPlanChange,
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

  if (access.tier === "FREE" || !subscriptionPlanHasFeature(access.tier, feature)) {
    throw new Error(`Subscription feature ${feature} is not entitled`);
  }

  return access;
}
