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
 * Authenticated entitlement probe for premium Project Pass outputs.
 *
 * This endpoint intentionally returns authorization state only. It never
 * accepts browser checkout state as payment authority and it does not expose
 * payment/provider details.
 */
export async function GET(request: Request) {
  const auth = await requireApiRoles(routeAccess.projects);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, authorized: false }, { status: auth.status });
  }

  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organizationId")?.trim() || undefined;
  const projectInstallationId = url.searchParams.get("projectInstallationId")?.trim() || "";
  const product = url.searchParams.get("product")?.trim() || "";

  if (!projectInstallationId || !isProjectPassProduct(product)) {
    return NextResponse.json(
      { ok: false, authorized: false, error: "Valid projectInstallationId and product are required." },
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

    return NextResponse.json(
      {
        ok: true,
        authorized: true,
        projectInstallationId: access.projectInstallationId,
        product: access.product,
      },
      {
        status: 200,
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
