import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getDesignFloorBackgroundAsset } from "@/lib/contractor-os/design-floor-background-repository";
import { readPrivateDesignAsset } from "@/lib/contractor-os/private-design-storage";
import { hasRequiredRole, routeAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

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
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(asset.originalName)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
