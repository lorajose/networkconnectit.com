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
    },
  });

  if (!subscription) {
    throw new Error("A paid subscription is required");
  }

  if (subscription.provider !== "stripe") {
    throw new Error("Unsupported subscription provider");
  }

  if (
    subscription.status !== "ACTIVE" &&
    subscription.status !== "TRIALING"
  ) {
    throw new Error("Only an active subscription can be changed");
  }

  return subscription;
}

/**
 * Server-authoritative recurring subscription change boundary.
 *
 * The caller provides only the requested commercial outcome. Organization and
 * provider subscription identity are loaded from persisted server state.
 * Stripe webhooks remain the only authority that updates local entitlement.
 */
export async function changeOrganizationSubscription(
  organizationId: string,
  requestedPlan: SubscriptionPlan | null
): Promise<SubscriptionChange> {
  const stored = await loadStoredSubscription(organizationId);
  const change = planSubscriptionChange(stored.plan, requestedPlan);

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
    await stripe.downgradeAtPeriodEnd({
      providerSubscriptionId: stored.providerSubscriptionId,
      organizationId,
      toPlan: change.toPlan,
    });
    return change;
  }

  await stripe.cancelAtPeriodEnd(stored.providerSubscriptionId);
  return change;
}
