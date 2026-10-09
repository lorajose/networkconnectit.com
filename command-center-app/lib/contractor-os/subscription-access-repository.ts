import { prisma } from "@/lib/db";

import type { CommercialActor } from "./commercial-access";
import { commercialReadScope } from "./commercial-access";
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
 * Reads provider-verified subscription state for one already-authorized
 * organization scope. Public callers should prefer the actor-scoped resolver
 * below so tenant selection cannot come from untrusted browser state.
 */
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

async function resolveOrganizationEffectiveSubscriptionAccess(
  organizationId: string,
  now = new Date()
): Promise<EffectiveSubscriptionAccess> {
  const [subscription, trial] = await Promise.all([
    getOrganizationSubscription(organizationId),
    getOrganizationProTrial(organizationId),
  ]);

  return resolveEffectiveSubscriptionAccess(subscription, trial, now);
}

/**
 * Server-owned entry point for commercial access decisions.
 *
 * CLIENT_ADMIN / VIEWER are always locked to the organization carried by the
 * authenticated server session. Internal admins may select an organization,
 * using the same existing commercialReadScope policy as the rest of the
 * Contractor OS. Paid provider state wins; otherwise an active one-time Pro
 * trial grants Pro; after expiry the organization falls back to Free.
 */
export async function getEffectiveSubscriptionAccessForActor(
  actor: CommercialActor,
  requestedOrganizationId?: string,
  now = new Date()
): Promise<EffectiveSubscriptionAccess> {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  return resolveOrganizationEffectiveSubscriptionAccess(scope.organizationId, now);
}
