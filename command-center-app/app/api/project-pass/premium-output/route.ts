import { NextResponse } from "next/server";

import { requireApiRoles } from "@/lib/api-auth";
import { requireServerVerifiedProjectPassAccess } from "@/lib/contractor-os/project-pass-access";
import { buildProjectPassPremiumOutputManifest } from "@/lib/contractor-os/project-pass-premium-output";
import { PROJECT_PASS_PRODUCTS, type ProjectPassProduct } from "@/lib/contractor-os/project-pass";
import { routeAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isProjectPassProduct(value: string): value is ProjectPassProduct {
  return PROJECT_PASS_PRODUCTS.includes(value as ProjectPassProduct);
}

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" } as const;

/**
 * Premium-output delivery boundary.
 *
 * Authorization and project-data loading both happen on the server. The
 * browser cannot supply the premium artifact payload and checkout-return state
 * never participates in entitlement. Renderers attach to the returned
 * project-bound manifest rather than trusting browser-generated diagram data.
 */
export async function POST(request: Request) {
  const auth = await requireApiRoles(routeAccess.projects);
  if (!auth.ok) {
    return NextResponse.json({ ok: false }, { status: auth.status, headers: PRIVATE_HEADERS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Valid JSON body is required." },
      { status: 400, headers: PRIVATE_HEADERS }
    );
  }

  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const organizationId = typeof input.organizationId === "string" ? input.organizationId.trim() || undefined : undefined;
  const projectInstallationId = typeof input.projectInstallationId === "string" ? input.projectInstallationId.trim() : "";
  const product = typeof input.product === "string" ? input.product.trim() : "";

  if (!projectInstallationId || !isProjectPassProduct(product)) {
    return NextResponse.json(
      { ok: false, error: "Valid projectInstallationId and product are required." },
      { status: 400, headers: PRIVATE_HEADERS }
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

    const manifest = await buildProjectPassPremiumOutputManifest({
      organizationId: access.organizationId,
      projectInstallationId: access.projectInstallationId,
      product: access.product,
    });

    return NextResponse.json(
      {
        ok: true,
        authorized: true,
        delivery: "PROJECT_BOUND_MANIFEST",
        manifest,
      },
      { status: 200, headers: PRIVATE_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { ok: false, authorized: false },
      { status: 403, headers: PRIVATE_HEADERS }
    );
  }
}
