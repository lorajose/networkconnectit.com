import { prisma } from "@/lib/db";
import type { VerifiedSubscriptionEvent } from "./subscription-stripe-provider";

/**
 * Applies one provider-verified subscription lifecycle event idempotently.
 * Tenant deliveries are serialized by locking Organization first.
 *
 * A canceled subscription identity may be replaced only by a newer/equal
 * verified subscription.created event from the same provider AND the same
 * previously verified provider customer. This prevents a different Stripe
 * customer from taking over an organization's persisted billing identity.
 */
export async function applyVerifiedSubscriptionEvent(event: VerifiedSubscriptionEvent) {
  return prisma.$transaction(async (tx) => {
    const organizations = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM Organization WHERE id = ${event.organizationId} FOR UPDATE
    `;
    if (organizations.length !== 1) throw new Error("Subscription organization does not exist");

    const existingEvent = await tx.organizationSubscriptionEvent.findUnique({
      where: { provider_providerEventId: { provider: event.provider, providerEventId: event.providerEventId } },
      select: { id: true },
    });
    if (existingEvent) return { applied: false as const, reason: "DUPLICATE" as const };

    const current = await tx.organizationSubscription.findUnique({
      where: { organizationId: event.organizationId },
      select: {
        provider: true,
        providerCustomerId: true,
        providerSubscriptionId: true,
        status: true,
        verifiedAt: true,
        pendingPlan: true,
      },
    });

    const identityChanged = current != null && (current.provider !== event.provider || current.providerSubscriptionId !== event.providerSubscriptionId);
    const replacementCandidate = identityChanged && current.provider === event.provider && current.status === "CANCELED" && event.eventType === "customer.subscription.created";
    const sameCustomer = replacementCandidate && current.providerCustomerId === event.providerCustomerId;
    const replacementNotOlder = replacementCandidate && event.verifiedAt >= current.verifiedAt;
    const verifiedReplacement = replacementCandidate && sameCustomer && replacementNotOlder;

    if (identityChanged && !verifiedReplacement) {
      if (replacementCandidate && !sameCustomer) throw new Error("Replacement subscription customer does not match persisted state");
      if (replacementCandidate && !replacementNotOlder) throw new Error("Replacement subscription event is older than persisted cancellation");
      throw new Error("Subscription provider identity does not match persisted state");
    }

    const stale = current && !verifiedReplacement ? event.verifiedAt < current.verifiedAt : false;
    const scheduledPlanReached = current?.pendingPlan != null && event.plan === current.pendingPlan;
    const clearPendingChange = verifiedReplacement || event.status === "CANCELED" || scheduledPlanReached;

    if (!stale) {
      await tx.organizationSubscription.upsert({
        where: { organizationId: event.organizationId },
        create: {
          organizationId: event.organizationId,
          provider: event.provider,
          providerCustomerId: event.providerCustomerId,
          providerSubscriptionId: event.providerSubscriptionId,
          plan: event.plan,
          status: event.status,
          currentPeriodStart: event.currentPeriodStart,
          currentPeriodEnd: event.currentPeriodEnd,
          cancelAtPeriodEnd: event.cancelAtPeriodEnd,
          verifiedAt: event.verifiedAt,
        },
        update: {
          provider: event.provider,
          providerCustomerId: event.providerCustomerId,
          providerSubscriptionId: event.providerSubscriptionId,
          plan: event.plan,
          status: event.status,
          currentPeriodStart: event.currentPeriodStart,
          currentPeriodEnd: event.currentPeriodEnd,
          cancelAtPeriodEnd: event.cancelAtPeriodEnd,
          verifiedAt: event.verifiedAt,
          ...(clearPendingChange ? { pendingPlan: null, providerScheduleId: null, pendingPlanEffectiveAt: null } : {}),
        },
      });
    }

    await tx.organizationSubscriptionEvent.create({
      data: {
        organizationId: event.organizationId,
        provider: event.provider,
        providerEventId: event.providerEventId,
        providerSubscriptionId: event.providerSubscriptionId,
        eventType: event.eventType,
        verified: true,
        receivedAt: new Date(),
      },
    });

    if (verifiedReplacement) return { applied: true as const, reason: "REPLACED" as const };
    return stale ? { applied: false as const, reason: "STALE" as const } : { applied: true as const, reason: "APPLIED" as const };
  });
}
