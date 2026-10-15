import { NextRequest, NextResponse } from "next/server";

import { requireApiRoles } from "@/lib/api-auth";
import { routeAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const ARCGIS_STATIC_MAP_URL = "https://static-maps-api.arcgis.com/arcgis/rest/services/static-maps-service/v1/static-maps/arcgis/imagery/with-point";

function errorJson(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

function finiteParam(value: string | null) {
  if (value === null || value.trim() === "") return Number.NaN;
  return Number(value);
}

export async function GET(request: NextRequest) {
  const auth = await requireApiRoles(routeAccess.designStudio);
  if (!auth.ok) return errorJson("Unauthorized", auth.status);

  const longitude = finiteParam(request.nextUrl.searchParams.get("longitude"));
  const latitude = finiteParam(request.nextUrl.searchParams.get("latitude"));
  const zoomValue = finiteParam(request.nextUrl.searchParams.get("zoom"));
  const zoom = Number.isFinite(zoomValue) ? Math.max(0, Math.min(22, Math.round(zoomValue))) : 19;
  if (!Number.isFinite(longitude) || longitude < -179.9 || longitude > 179.9 || !Number.isFinite(latitude) || latitude < -85.05 || latitude > 85.05) {
    return errorJson("Invalid aerial map coordinates", 400);
  }

  const token = process.env.ARCGIS_LOCATION_API_TOKEN?.trim() ?? "";
  if (!token) return errorJson("Aerial imagery is not configured", 503);

  const url = new URL(ARCGIS_STATIC_MAP_URL);
  url.searchParams.set("x", String(longitude));
  url.searchParams.set("y", String(latitude));
  url.searchParams.set("centerX", String(longitude));
  url.searchParams.set("centerY", String(latitude));
  url.searchParams.set("zoom", String(zoom));
  url.searchParams.set("width", "1024");
  url.searchParams.set("height", "640");
  url.searchParams.set("format", "jpeg");
  url.searchParams.set("symbolStyle", "circle");
  url.searchParams.set("symbolScale", "0.7");
  url.searchParams.set("referenceDetails", "all");
  url.searchParams.set("attribution", "auto");

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "image/jpeg" },
      cache: "no-store",
    });
    if (!upstream.ok) return errorJson("Aerial imagery is temporarily unavailable", 502);
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("image/")) return errorJson("Aerial imagery returned an invalid response", 502);
    const bytes = await upstream.arrayBuffer();
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return errorJson("Aerial imagery is temporarily unavailable", 502);
  }
}
