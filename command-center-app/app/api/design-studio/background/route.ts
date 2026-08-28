import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getDesignFloorBackgroundAsset } from "@/lib/contractor-os/design-floor-background-repository";
import { readPrivateDesignAsset } from "@/lib/contractor-os/private-design-storage";
import { hasRequiredRole, routeAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

type ByteRange = { start: number; end: number };

function parseByteRange(value: string | null, totalBytes: number): ByteRange | null {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match) return null;

  const startToken = match[1];
  const endToken = match[2];
  if (!startToken && !endToken) return null;

  if (!startToken) {
    const suffixLength = Number(endToken);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    const start = Math.max(0, totalBytes - suffixLength);
    return { start, end: totalBytes - 1 };
  }

  const start = Number(startToken);
  const requestedEnd = endToken ? Number(endToken) : totalBytes - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start < 0 || requestedEnd < start || start >= totalBytes) {
    return null;
  }
  return { start, end: Math.min(requestedEnd, totalBytes - 1) };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.id || !user.role || !hasRequiredRole(user.role, routeAccess.designStudio)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  const floorId = request.nextUrl.searchParams.get("floorId")?.trim() ?? "";
  const requestedOrganizationId = request.nextUrl.searchParams.get("organizationId")?.trim() ?? "";
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : requestedOrganizationId;
  if (!organizationId || !projectId || !floorId) return new NextResponse("Not found", { status: 404 });

  const asset = await getDesignFloorBackgroundAsset(
    { role: user.role, organizationId: user.organizationId },
    projectId,
    floorId,
    organizationId,
  );
  if (!asset) return new NextResponse("Not found", { status: 404 });

  const bytes = await readPrivateDesignAsset(asset.storageKey);
  const commonHeaders = {
    "Content-Type": asset.mimeType,
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(asset.originalName)}`,
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  };

  const requestedRange = request.headers.get("range");
  if (requestedRange) {
    const range = parseByteRange(requestedRange, bytes.byteLength);
    if (!range) {
      return new NextResponse(null, {
        status: 416,
        headers: { ...commonHeaders, "Content-Range": `bytes */${bytes.byteLength}` },
      });
    }
    const chunk = bytes.slice(range.start, range.end + 1);
    return new NextResponse(chunk, {
      status: 206,
      headers: {
        ...commonHeaders,
        "Content-Length": String(chunk.byteLength),
        "Content-Range": `bytes ${range.start}-${range.end}/${bytes.byteLength}`,
      },
    });
  }

  return new NextResponse(bytes, {
    status: 200,
    headers: { ...commonHeaders, "Content-Length": String(bytes.byteLength) },
  });
}
