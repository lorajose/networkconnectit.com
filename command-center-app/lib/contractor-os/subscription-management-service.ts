import { prisma } from "@/lib/db";

import { planSubscriptionChange, type SubscriptionChange } from "./subscription-lifecycle";
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

async function loadStoredSubscription(organizationId: string): Promise<StoredSubscription> {
  if (!organizationId.trim()) throw new Error("Subscription organization is required");
  const subscription = await prisma.organizationSubscription.findUnique({
    where: { organizationId },
    select: { provider: true, providerSubscriptionId: true, plan: true, status: true, pendingPlan: true, providerScheduleId: true },
  });
  if (!subscription) throw new Error("A paid subscription is required");
  if (subscription.provider !== "stripe") throw new Error("Unsupported subscription provider");
  if (subscription.status !== "ACTIVE" && subscription.status !== "TRIALING") throw new Error("Only an active subscription can be changed");
  return subscription;
}

function stripeManagement() {
  const config = resolveSubscriptionStripeConfig();
  if (!config.configured) throw new Error("Subscription billing is not configured");
  return new StripeSubscriptionManagement(config.config);
}

export async function cancelOrganizationScheduledPlanChange(organizationId: string): Promise<void> {
  const stored = await loadStoredSubscription(organizationId);
  if (!stored.providerScheduleId || !stored.pendingPlan) throw new Error("No subscription plan change is scheduled");
  const stripe = stripeManagement();
  await stripe.releaseScheduledChange({
    providerScheduleId: stored.providerScheduleId,
    providerSubscriptionId: stored.providerSubscriptionId,
  });
  await prisma.organizationSubscription.update({
    where: { organizationId, providerSubscriptionId: stored.providerSubscriptionId },
    data: { pendingPlan: null, providerScheduleId: null, pendingPlanEffectiveAt: null },
  });
}

/** Server-authoritative recurring subscription change boundary. */
export async function changeOrganizationSubscription(
  organizationId: string,
  requestedPlan: SubscriptionPlan | null
): Promise<SubscriptionChange> {
  const stored = await loadStoredSubscription(organizationId);
  const change = planSubscriptionChange(stored.plan, requestedPlan);
  if (stored.providerScheduleId || stored.pendingPlan) throw new Error("A subscription plan change is already scheduled");
  const stripe = stripeManagement();

  if (change.kind === "UPGRADE") {
    await stripe.upgrade({ providerSubscriptionId: stored.providerSubscriptionId, organizationId, toPlan: change.toPlan });
    return change;
  }
  if (change.kind === "DOWNGRADE") {
    const scheduled = await stripe.downgradeAtPeriodEnd({ providerSubscriptionId: stored.providerSubscriptionId, organizationId, toPlan: change.toPlan });
    await prisma.organizationSubscription.update({
      where: { organizationId, providerSubscriptionId: stored.providerSubscriptionId },
      data: { pendingPlan: change.toPlan, providerScheduleId: scheduled.providerScheduleId, pendingPlanEffectiveAt: scheduled.effectiveAt },
    });
    return change;
  }
  await stripe.cancelAtPeriodEnd(stored.providerSubscriptionId);
  return change;
}
