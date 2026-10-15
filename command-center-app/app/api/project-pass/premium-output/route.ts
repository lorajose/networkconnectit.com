import { NextResponse } from "next/server";

import { requireApiRoles } from "@/lib/api-auth";
import { requireServerVerifiedProjectPassAccess } from "@/lib/contractor-os/project-pass-access";
import { buildProjectPassPremiumOutputManifest } from "@/lib/contractor-os/project-pass-premium-output";
import { renderProjectPassCctvSvg } from "@/lib/contractor-os/project-pass-svg-renderer";
import { PROJECT_PASS_PRODUCTS, type ProjectPassProduct } from "@/lib/contractor-os/project-pass";
import { routeAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isProjectPassProduct(value: string): value is ProjectPassProduct {
  return PROJECT_PASS_PRODUCTS.includes(value as ProjectPassProduct);
}

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" } as const;

function safeFilenamePart(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || "project";
}

/**
 * Premium-output delivery boundary.
 *
 * Authorization, project-data loading and rendering all happen on the server.
 * The browser supplies only project/product identity; it cannot supply SVG,
 * HTML or artifact payload. Checkout-return state never participates in
 * entitlement or delivery authority.
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
    const svg = renderProjectPassCctvSvg(manifest);
    const filename = `${safeFilenamePart(manifest.project.name)}-cctv-diagram.svg`;

    return new Response(svg, {
      status: 200,
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, authorized: false },
      { status: 403, headers: PRIVATE_HEADERS }
    );
  }
}
