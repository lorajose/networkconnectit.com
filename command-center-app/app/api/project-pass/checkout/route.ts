import { NextResponse } from "next/server";

import { requireApiRoles } from "@/lib/api-auth";
import { PROJECT_PASS_PRODUCTS, type ProjectPassProduct } from "@/lib/contractor-os/project-pass";
import { createProjectPassCheckout } from "@/lib/contractor-os/project-pass-payment-service";
import { resolveProjectPassPaymentProvider } from "@/lib/contractor-os/project-pass-provider-registry";
import { routeAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

function isProjectPassProduct(value: unknown): value is ProjectPassProduct {
  return typeof value === "string" && PROJECT_PASS_PRODUCTS.includes(value as ProjectPassProduct);
}

type CheckoutBody = {
  organizationId?: unknown;
  projectInstallationId?: unknown;
  product?: unknown;
};

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

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "A valid JSON request body is required." },
      { status: 400 }
    );
  }

  const organizationId =
    typeof body.organizationId === "string" && body.organizationId.trim()
      ? body.organizationId.trim()
      : auth.user.organizationId?.trim() || "";
  const projectInstallationId =
    typeof body.projectInstallationId === "string" ? body.projectInstallationId.trim() : "";
  const product = body.product;

  if (!organizationId || !projectInstallationId || !isProjectPassProduct(product)) {
    return NextResponse.json(
      { ok: false, error: "Valid organization, projectInstallationId and product are required." },
      { status: 400 }
    );
  }

  const providerResolution = resolveProjectPassPaymentProvider();
  if (!providerResolution.configured) {
    return NextResponse.json(
      {
        ok: false,
        code: providerResolution.reason,
        error: "Project Pass checkout is not configured yet.",
      },
      {
        status: 503,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }

  const requestUrl = new URL(request.url);
  const returnBase = `${requestUrl.origin}/projects/${encodeURIComponent(projectInstallationId)}/project-pass/return`;
  const successUrl = `${returnBase}?status=success&product=${encodeURIComponent(product)}`;
  const cancelUrl = `${returnBase}?status=cancelled&product=${encodeURIComponent(product)}`;

  try {
    const checkout = await createProjectPassCheckout(providerResolution.provider, {
      organizationId,
      projectInstallationId,
      product,
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
