import { NextResponse } from "next/server";

import { applyVerifiedSubscriptionEvent } from "@/lib/contractor-os/subscription-repository";
import { resolveSubscriptionPaymentProvider } from "@/lib/contractor-os/subscription-provider-registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public Stripe webhook boundary for recurring subscriptions.
 *
 * There is intentionally no user-session authentication here. Authenticity is
 * established by Stripe-Signature over the unmodified raw request body before
 * any subscription state reaches persistence.
 */
export async function POST(request: Request) {
  const providerResolution = resolveSubscriptionPaymentProvider();
  if (!providerResolution.configured) {
    return NextResponse.json(
      { received: false, code: "PROVIDER_NOT_CONFIGURED" },
      { status: 503, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  try {
    const event = providerResolution.provider.verifyWebhook(rawBody, signature);
    await applyVerifiedSubscriptionEvent(event);

    return NextResponse.json(
      { received: true },
      { status: 200, headers: { "Cache-Control": "private, no-store" } }
    );
  } catch {
    return NextResponse.json(
      { received: false },
      { status: 400, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
