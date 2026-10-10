import { NextResponse } from "next/server";

import { requireApiRoles } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { getSubscriptionExperienceSummaryForActor } from "@/lib/contractor-os/subscription-access-repository";
import { subscriptionApplicationRoot } from "@/lib/contractor-os/subscription-checkout-origin";
import { isSubscriptionPlan, type SubscriptionPlan } from "@/lib/contractor-os/subscription-plan";
import { resolveSubscriptionPaymentProvider } from "@/lib/contractor-os/subscription-provider-registry";

export const dynamic = "force-dynamic";

type SubscriptionCheckoutHttpInput = {
  plan?: unknown;
};

const BILLING_ROLES = ["CLIENT_ADMIN"] as const;

/**
 * Authenticated recurring-subscription checkout entry point.
 *
 * The browser may select only PRO or BUSINESS. Organization identity comes
 * exclusively from the authenticated session and Stripe price IDs remain
 * server-owned. Returning from Checkout never grants entitlement; verified
 * provider lifecycle events are the only authority for paid access.
 */
export async function POST(request: Request) {
  const auth = await requireApiRoles(BILLING_ROLES);
  if (!auth.ok) {
    return NextResponse.json({ ok: false }, { status: auth.status });
  }

  const organizationId = auth.user.organizationId?.trim() ?? "";
  if (!organizationId) {
    return NextResponse.json(
      { ok: false, error: "An organization is required for subscription checkout." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  let body: SubscriptionCheckoutHttpInput;
  try {
    body = (await request.json()) as SubscriptionCheckoutHttpInput;
  } catch {
    return NextResponse.json(
      { ok: false, error: "A valid JSON request body is required." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  if (typeof body.plan !== "string" || !isSubscriptionPlan(body.plan)) {
    return NextResponse.json(
      { ok: false, error: "A valid subscription plan is required." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const plan: SubscriptionPlan = body.plan;
  const actor = { role: auth.user.role, organizationId } as const;
  const current = await getSubscriptionExperienceSummaryForActor(actor);

  if (current.source === "SUBSCRIPTION" && current.tier === plan) {
    return NextResponse.json(
      { ok: false, error: "This organization already has the selected subscription plan." },
      { status: 409, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  if (current.source === "SUBSCRIPTION") {
    return NextResponse.json(
      {
        ok: false,
        error: "Existing paid subscriptions must use the subscription change flow.",
      },
      { status: 409, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  // A canceled provider identity remains persisted for audit and replay safety.
  // Do not create a second Stripe subscription until the explicit replacement
  // policy can atomically preserve that history without weakening webhook identity.
  const priorPaidSubscription = await prisma.organizationSubscription.findUnique({
    where: { organizationId },
    select: { status: true },
  });
  if (priorPaidSubscription) {
    return NextResponse.json(
      {
        ok: false,
        code: "SUBSCRIPTION_REACTIVATION_REQUIRED",
        error: "This organization has subscription history. Reactivation must use the secure resubscribe flow.",
      },
      { status: 409, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const providerResolution = resolveSubscriptionPaymentProvider();
  if (!providerResolution.configured) {
    return NextResponse.json(
      {
        ok: false,
        code: providerResolution.reason,
        error: "Subscription billing is not configured yet.",
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  let applicationRoot: string;
  try {
    applicationRoot = subscriptionApplicationRoot();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Subscription checkout return URL is not configured." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const billingUrl = `${applicationRoot}/billing`;
  const successUrl = `${billingUrl}?subscriptionStatus=processing&plan=${encodeURIComponent(plan)}`;
  const cancelUrl = `${billingUrl}?subscriptionStatus=cancelled&plan=${encodeURIComponent(plan)}`;

  try {
    const checkout = await providerResolution.provider.createCheckout({
      organizationId,
      plan,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json(
      { ok: true, checkoutUrl: checkout.checkoutUrl },
      { status: 200, headers: { "Cache-Control": "private, no-store" } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to start subscription checkout." },
      { status: 502, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
