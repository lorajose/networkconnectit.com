import { prisma } from "@/lib/db";
import type { VerifiedSubscriptionEvent } from "./subscription-stripe-provider";

/**
 * Applies one provider-verified subscription lifecycle event idempotently.
 *
 * The organization row is locked first so concurrent deliveries for the same
 * tenant are serialized before duplicate detection or entitlement mutation.
 * Older verified events remain auditable but cannot overwrite newer state.
 *
 * A provider identity may be replaced only when the persisted subscription is
 * already CANCELED and Stripe sends a verified subscription.created event for
 * the same organization. All prior provider events remain in the audit table.
 */
export async function applyVerifiedSubscriptionEvent(
  event: VerifiedSubscriptionEvent
) {
  return prisma.$transaction(async (tx) => {
    const organizations = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM Organization
      WHERE id = ${event.organizationId}
      FOR UPDATE
    `;

    if (organizations.length !== 1) {
      throw new Error("Subscription organization does not exist");
    }

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

    const current = await tx.organizationSubscription.findUnique({
      where: { organizationId: event.organizationId },
      select: {
        provider: true,
        providerSubscriptionId: true,
        status: true,
        verifiedAt: true,
      },
    });

    const identityChanged =
      current != null &&
      (current.provider !== event.provider ||
        current.providerSubscriptionId !== event.providerSubscriptionId);
    const verifiedReplacement =
      identityChanged &&
      current.provider === event.provider &&
      current.status === "CANCELED" &&
      event.eventType === "customer.subscription.created";

    if (identityChanged && !verifiedReplacement) {
      throw new Error("Subscription provider identity does not match persisted state");
    }

    const stale =
      current && !verifiedReplacement ? event.verifiedAt < current.verifiedAt : false;

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

    if (verifiedReplacement) {
      return { applied: true as const, reason: "REPLACED" as const };
    }

    return stale
      ? { applied: false as const, reason: "STALE" as const }
      : { applied: true as const, reason: "APPLIED" as const };
  });
}
