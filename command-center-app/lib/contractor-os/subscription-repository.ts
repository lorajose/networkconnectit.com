import { prisma } from "@/lib/db";
import type { VerifiedSubscriptionEvent } from "./subscription-stripe-provider";

/**
 * Applies one provider-verified subscription lifecycle event idempotently.
 *
 * Event identity is unique per provider. The subscription row is then upserted
 * by organization so a verified Stripe lifecycle update becomes the sole paid
 * entitlement authority for that tenant.
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
      return { applied: false as const };
    }

    const organization = await tx.organization.findUnique({
      where: { id: event.organizationId },
      select: { id: true },
    });

    if (!organization) {
      throw new Error("Subscription organization does not exist");
    }

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

    return { applied: true as const };
  });
}
