import { prisma } from "@/lib/db";

import {
  resolveEffectiveSubscriptionAccess,
  type EffectiveSubscriptionAccess,
  type SubscriptionRecord,
} from "./subscription-lifecycle";
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

/**
 * Reads provider-verified subscription state for an authenticated organization.
 * The organization id must be derived server-side from the current session.
 */
export async function getOrganizationSubscription(
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

/**
 * Single server-owned entry point for commercial access decisions.
 * Paid provider state wins; otherwise an active one-time Pro trial grants Pro;
 * after trial expiry the organization falls back to Free without data loss.
 */
export async function getOrganizationEffectiveSubscriptionAccess(
  organizationId: string,
  now = new Date()
): Promise<EffectiveSubscriptionAccess> {
  if (!organizationId.trim()) {
    throw new Error("Subscription organization is required");
  }

  const [subscription, trial] = await Promise.all([
    getOrganizationSubscription(organizationId),
    getOrganizationProTrial(organizationId),
  ]);

  return resolveEffectiveSubscriptionAccess(subscription, trial, now);
}
