import { NextResponse } from "next/server";

import { requireApiRoles } from "@/lib/api-auth";
import { requireServerVerifiedProjectPassAccess } from "@/lib/contractor-os/project-pass-access";
import { PROJECT_PASS_PRODUCTS, type ProjectPassProduct } from "@/lib/contractor-os/project-pass";
import { routeAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

function isProjectPassProduct(value: string): value is ProjectPassProduct {
  return PROJECT_PASS_PRODUCTS.includes(value as ProjectPassProduct);
}

/**
 * Premium-output delivery boundary.
 *
 * The actual PNG/PDF renderer can be attached behind this route. Keeping the
 * entitlement check here ensures no paid artifact can be returned before the
 * authenticated tenant/project/product tuple has a server-verified Project
 * Pass. Browser checkout flags are never consulted.
 */
export async function POST(request: Request) {
  const auth = await requireApiRoles(routeAccess.projects);
  if (!auth.ok) {
    return NextResponse.json({ ok: false }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Valid JSON body is required." }, { status: 400 });
  }

  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const organizationId = typeof input.organizationId === "string" ? input.organizationId.trim() || undefined : undefined;
  const projectInstallationId = typeof input.projectInstallationId === "string" ? input.projectInstallationId.trim() : "";
  const product = typeof input.product === "string" ? input.product.trim() : "";

  if (!projectInstallationId || !isProjectPassProduct(product)) {
    return NextResponse.json(
      { ok: false, error: "Valid projectInstallationId and product are required." },
      { status: 400 }
    );
  }

  try {
    const access = await requireServerVerifiedProjectPassAccess(
      {
        id: auth.user.id,
        role: auth.user.role,
        organizationId: auth.user.organizationId ?? null,
      },
      { organizationId, projectInstallationId, product }
    );

    // NCI-016 intentionally stops before returning a fake artifact. The
    // renderer/exporter must be wired here so entitlement verification remains
    // inseparable from premium delivery.
    return NextResponse.json(
      {
        ok: true,
        authorized: true,
        projectInstallationId: access.projectInstallationId,
        product: access.product,
        delivery: "RENDERER_REQUIRED",
      },
      {
        status: 501,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  } catch {
    return NextResponse.json(
      { ok: false, authorized: false },
      {
        status: 403,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }
}
