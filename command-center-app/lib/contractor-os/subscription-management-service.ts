import { prisma } from "@/lib/db";

import {
  planSubscriptionChange,
  type SubscriptionChange,
} from "./subscription-lifecycle";
import type { SubscriptionPlan } from "./subscription-plan";
import { resolveSubscriptionStripeConfig } from "./subscription-stripe-config";
import { StripeSubscriptionManagement } from "./subscription-stripe-management";

type StoredSubscription = {
  provider: string;
  providerSubscriptionId: string;
  plan: SubscriptionPlan;
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE";
  pendingPlan: SubscriptionPlan | null;
  providerScheduleId: string | null;
};

async function loadStoredSubscription(
  organizationId: string
): Promise<StoredSubscription> {
  if (!organizationId.trim()) {
    throw new Error("Subscription organization is required");
  }

  const subscription = await prisma.organizationSubscription.findUnique({
    where: { organizationId },
    select: {
      provider: true,
      providerSubscriptionId: true,
      plan: true,
      status: true,
      pendingPlan: true,
      providerScheduleId: true,
    },
  });

  if (!subscription) throw new Error("A paid subscription is required");
  if (subscription.provider !== "stripe") {
    throw new Error("Unsupported subscription provider");
  }
  if (subscription.status !== "ACTIVE" && subscription.status !== "TRIALING") {
    throw new Error("Only an active subscription can be changed");
  }

  return subscription;
}

/**
 * Server-authoritative recurring subscription change boundary.
 * Stripe confirms provider mutations first. Local scheduled-change state is
 * persisted only after Stripe has accepted the complete downgrade schedule.
 * Current entitlement still changes only through verified subscription webhooks.
 */
export async function changeOrganizationSubscription(
  organizationId: string,
  requestedPlan: SubscriptionPlan | null
): Promise<SubscriptionChange> {
  const stored = await loadStoredSubscription(organizationId);
  const change = planSubscriptionChange(stored.plan, requestedPlan);

  if (stored.providerScheduleId || stored.pendingPlan) {
    throw new Error("A subscription plan change is already scheduled");
  }

  const config = resolveSubscriptionStripeConfig();
  if (!config.configured) {
    throw new Error("Subscription billing is not configured");
  }

  const stripe = new StripeSubscriptionManagement(config.config);

  if (change.kind === "UPGRADE") {
    await stripe.upgrade({
      providerSubscriptionId: stored.providerSubscriptionId,
      organizationId,
      toPlan: change.toPlan,
    });
    return change;
  }

  if (change.kind === "DOWNGRADE") {
    const scheduled = await stripe.downgradeAtPeriodEnd({
      providerSubscriptionId: stored.providerSubscriptionId,
      organizationId,
      toPlan: change.toPlan,
    });

    await prisma.organizationSubscription.update({
      where: {
        organizationId,
        providerSubscriptionId: stored.providerSubscriptionId,
      },
      data: {
        pendingPlan: change.toPlan,
        providerScheduleId: scheduled.providerScheduleId,
        pendingPlanEffectiveAt: scheduled.effectiveAt,
      },
    });
    return change;
  }

  await stripe.cancelAtPeriodEnd(stored.providerSubscriptionId);
  return change;
}
