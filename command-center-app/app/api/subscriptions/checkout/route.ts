import { NextResponse } from "next/server";

import { requireApiRoles } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { getSubscriptionExperienceSummaryForActor } from "@/lib/contractor-os/subscription-access-repository";
import { subscriptionApplicationRoot } from "@/lib/contractor-os/subscription-checkout-origin";
import { isSubscriptionPlan, type SubscriptionPlan } from "@/lib/contractor-os/subscription-plan";
import { resolveSubscriptionPaymentProvider } from "@/lib/contractor-os/subscription-provider-registry";

export const dynamic = "force-dynamic";
type SubscriptionCheckoutHttpInput = { plan?: unknown };
const BILLING_ROLES = ["CLIENT_ADMIN"] as const;

export async function POST(request: Request) {
  const auth = await requireApiRoles(BILLING_ROLES);
  if (!auth.ok) return NextResponse.json({ ok: false }, { status: auth.status });
  const organizationId = auth.user.organizationId?.trim() ?? "";
  if (!organizationId) return NextResponse.json({ ok: false, error: "An organization is required for subscription checkout." }, { status: 403, headers: { "Cache-Control": "private, no-store" } });

  let body: SubscriptionCheckoutHttpInput;
  try { body = (await request.json()) as SubscriptionCheckoutHttpInput; }
  catch { return NextResponse.json({ ok: false, error: "A valid JSON request body is required." }, { status: 400, headers: { "Cache-Control": "private, no-store" } }); }
  if (typeof body.plan !== "string" || !isSubscriptionPlan(body.plan)) return NextResponse.json({ ok: false, error: "A valid subscription plan is required." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });

  const plan: SubscriptionPlan = body.plan;
  const current = await getSubscriptionExperienceSummaryForActor({ role: auth.user.role, organizationId });
  if (current.source === "SUBSCRIPTION" && current.tier === plan) return NextResponse.json({ ok: false, error: "This organization already has the selected subscription plan." }, { status: 409, headers: { "Cache-Control": "private, no-store" } });
  if (current.source === "SUBSCRIPTION") return NextResponse.json({ ok: false, error: "Existing paid subscriptions must use the subscription change flow." }, { status: 409, headers: { "Cache-Control": "private, no-store" } });

  // A resubscribe reuses the previously verified Stripe customer. The browser
  // cannot supply or replace this identity; only persisted provider state can.
  const priorPaidSubscription = await prisma.organizationSubscription.findUnique({
    where: { organizationId },
    select: { status: true, provider: true, providerCustomerId: true },
  });
  if (priorPaidSubscription && priorPaidSubscription.status !== "CANCELED") return NextResponse.json({ ok: false, code: "SUBSCRIPTION_REACTIVATION_BLOCKED", error: "This organization has a subscription that is not fully canceled yet." }, { status: 409, headers: { "Cache-Control": "private, no-store" } });
  if (priorPaidSubscription && priorPaidSubscription.provider !== "stripe") return NextResponse.json({ ok: false, code: "SUBSCRIPTION_REACTIVATION_BLOCKED", error: "This subscription cannot be reactivated with the configured billing provider." }, { status: 409, headers: { "Cache-Control": "private, no-store" } });

  const providerResolution = resolveSubscriptionPaymentProvider();
  if (!providerResolution.configured) return NextResponse.json({ ok: false, code: providerResolution.reason, error: "Subscription billing is not configured yet." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  let applicationRoot: string;
  try { applicationRoot = subscriptionApplicationRoot(); }
  catch { return NextResponse.json({ ok: false, error: "Subscription checkout return URL is not configured." }, { status: 503, headers: { "Cache-Control": "private, no-store" } }); }

  const billingUrl = `${applicationRoot}/billing`;
  const successUrl = `${billingUrl}?subscriptionStatus=processing&plan=${encodeURIComponent(plan)}`;
  const cancelUrl = `${billingUrl}?subscriptionStatus=cancelled&plan=${encodeURIComponent(plan)}`;
  try {
    const checkout = await providerResolution.provider.createCheckout({ organizationId, plan, successUrl, cancelUrl, providerCustomerId: priorPaidSubscription?.providerCustomerId ?? null });
    return NextResponse.json({ ok: true, checkoutUrl: checkout.checkoutUrl }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to start subscription checkout." }, { status: 502, headers: { "Cache-Control": "private, no-store" } });
  }
}
