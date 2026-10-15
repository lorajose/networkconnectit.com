import { NextResponse } from "next/server";

import { processProjectPassWebhook } from "@/lib/contractor-os/project-pass-payment-service";
import { resolveProjectPassPaymentProvider } from "@/lib/contractor-os/project-pass-provider-registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public Stripe webhook boundary for Project Pass.
 *
 * There is intentionally no user-session authentication here. Authenticity is
 * established by the Stripe-Signature header over the unmodified raw request
 * body before any payment fact can reach persistence.
 */
export async function POST(request: Request) {
  const providerResolution = resolveProjectPassPaymentProvider();
  if (
    !providerResolution.configured ||
    providerResolution.provider.name !== "stripe"
  ) {
    return NextResponse.json(
      { ok: false, code: "PROVIDER_NOT_CONFIGURED" },
      { status: 503, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  try {
    await processProjectPassWebhook(providerResolution.provider, {
      rawBody,
      signature,
      headers: {
        "stripe-signature": signature ?? undefined,
      },
    });

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
