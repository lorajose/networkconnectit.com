import { NextResponse } from "next/server";

import { requireApiRoles } from "@/lib/api-auth";
import { validateProjectPassCheckoutHttpInput, type ProjectPassCheckoutHttpInput } from "@/lib/contractor-os/project-pass-checkout-http-policy";
import { decideProjectPassCheckoutRoute } from "@/lib/contractor-os/project-pass-checkout-route-policy";
import { createProjectPassCheckout } from "@/lib/contractor-os/project-pass-payment-service";
import { resolveProjectPassPaymentProvider } from "@/lib/contractor-os/project-pass-provider-registry";
import { routeAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * Authenticated Project Pass checkout entry point.
 *
 * The client supplies only tenant/project/product intent. Price and currency
 * remain server-owned, return URLs are generated here, and provider selection
 * is centralized in the fail-closed registry. A checkout URL is navigation
 * only; entitlement can be granted only by a later verified provider event.
 */
export async function POST(request: Request) {
  const auth = await requireApiRoles(routeAccess.projects);
  if (!auth.ok) {
    return NextResponse.json({ ok: false }, { status: auth.status });
  }

  let body: ProjectPassCheckoutHttpInput;
  try {
    body = (await request.json()) as ProjectPassCheckoutHttpInput;
  } catch {
    return NextResponse.json(
      { ok: false, error: "A valid JSON request body is required." },
      { status: 400 }
    );
  }

  const validation = validateProjectPassCheckoutHttpInput(body, auth.user.organizationId);
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, error: validation.message },
      { status: validation.status }
    );
  }

  const providerResolution = resolveProjectPassPaymentProvider();
  const routeDecision = decideProjectPassCheckoutRoute(
    validation.input,
    providerResolution.configured
      ? { configured: true }
      : { configured: false, reason: providerResolution.reason }
  );

  if (!routeDecision.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: routeDecision.code,
        error: routeDecision.message,
      },
      {
        status: routeDecision.status,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }

  if (!providerResolution.configured) {
    // The route policy above is fail-closed; this guard keeps TypeScript and
    // future refactors from reaching provider code without a configured adapter.
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const requestUrl = new URL(request.url);
  const returnBase = `${requestUrl.origin}/projects/${encodeURIComponent(routeDecision.input.projectInstallationId)}/project-pass/return`;
  const successUrl = `${returnBase}?status=success&product=${encodeURIComponent(routeDecision.input.product)}`;
  const cancelUrl = `${returnBase}?status=cancelled&product=${encodeURIComponent(routeDecision.input.product)}`;

  try {
    const checkout = await createProjectPassCheckout(providerResolution.provider, {
      ...routeDecision.input,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json(
      { ok: true, checkoutUrl: checkout.checkoutUrl },
      {
        status: 200,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to start Project Pass checkout." },
      {
        status: 403,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }
}
