import { NextRequest, NextResponse } from "next/server";

import { requireApiRoles } from "@/lib/api-auth";
import { createConfiguredAerialSiteProvider } from "@/lib/contractor-os/aerial-site-provider";
import { confirmAerialSiteLocation } from "@/lib/contractor-os/aerial-site-location-repository";
import { routeAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireApiRoles(routeAccess.designStudio);
  if (!auth.ok) return noStoreJson({ error: "Unauthorized" }, auth.status);

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 4) return noStoreJson({ error: "A complete site address is required" }, 400);

  try {
    const provider = createConfiguredAerialSiteProvider();
    const candidates = await provider.geocodeAddress({ query, forStorage: true });
    return noStoreJson({ candidates, basemap: provider.basemap() });
  } catch (error) {
    const message = error instanceof Error && error.message === "ArcGIS access token is required"
      ? "Aerial site lookup is not configured"
      : "Aerial site lookup is temporarily unavailable";
    return noStoreJson({ error: message }, 503);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiRoles(routeAccess.designStudio);
  if (!auth.ok) return noStoreJson({ error: "Unauthorized" }, auth.status);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: "Invalid request" }, 400);
  }

  if (!body || typeof body !== "object") return noStoreJson({ error: "Invalid request" }, 400);
  const value = body as Record<string, unknown>;
  const siteId = typeof value.siteId === "string" ? value.siteId : "";
  const organizationId = typeof value.organizationId === "string" ? value.organizationId : "";
  const formattedAddress = typeof value.formattedAddress === "string" ? value.formattedAddress : "";
  const latitude = typeof value.latitude === "number" ? value.latitude : Number.NaN;
  const longitude = typeof value.longitude === "number" ? value.longitude : Number.NaN;

  try {
    const confirmed = await confirmAerialSiteLocation({
      actor: { role: auth.user.role, organizationId: auth.user.organizationId },
      siteId,
      requestedOrganizationId: organizationId,
      formattedAddress,
      latitude,
      longitude,
    });
    if (!confirmed) return noStoreJson({ error: "Site not found" }, 404);
    return noStoreJson({ location: confirmed });
  } catch {
    return noStoreJson({ error: "Invalid site location" }, 400);
  }
}
