import { prisma } from "@/lib/db";
import type { VerifiedSubscriptionEvent } from "./subscription-stripe-provider";

/**
 * Applies one provider-verified subscription lifecycle event idempotently.
 *
 * Event identity is unique per provider. Older provider events are recorded for
 * audit/idempotency but cannot overwrite a newer verified subscription state.
 */
export async function applyVerifiedSubscriptionEvent(
  event: VerifiedSubscriptionEvent
) {
  return prisma.$transaction(async (tx) => {
    const existingEvent = await tx.organizationSubscriptionEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider: event.provider,
          providerEventId: event.providerEventId,
        },
      },
      select: { id: true },
    });

    if (existingEvent) {
      return { applied: false as const, reason: "DUPLICATE" as const };
    }

    const organization = await tx.organization.findUnique({
      where: { id: event.organizationId },
      select: { id: true },
    });

    if (!organization) {
      throw new Error("Subscription organization does not exist");
    }

    const current = await tx.organizationSubscription.findUnique({
      where: { organizationId: event.organizationId },
      select: {
        provider: true,
        providerSubscriptionId: true,
        verifiedAt: true,
      },
    });

    if (
      current &&
      (current.provider !== event.provider ||
        current.providerSubscriptionId !== event.providerSubscriptionId)
    ) {
      throw new Error("Subscription provider identity does not match persisted state");
    }

    const stale = current ? event.verifiedAt < current.verifiedAt : false;

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

    return stale
      ? { applied: false as const, reason: "STALE" as const }
      : { applied: true as const, reason: "APPLIED" as const };
  });
}
