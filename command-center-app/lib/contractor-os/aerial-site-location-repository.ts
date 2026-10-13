import { prisma } from "@/lib/db";
import type { AppRole } from "@/lib/rbac";

type Actor = {
  role: AppRole;
  organizationId?: string | null;
};

export type ConfirmedAerialSiteLocation = {
  siteId: string;
  organizationId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
};

function resolveOrganizationId(actor: Actor, requestedOrganizationId?: string | null) {
  const requested = requestedOrganizationId?.trim() ?? "";
  if (actor.role === "CLIENT_ADMIN" || actor.role === "VIEWER") {
    return actor.organizationId?.trim() ?? "";
  }
  return requested;
}

function assertCoordinateRange(latitude: number, longitude: number) {
  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) {
    throw new Error("Invalid site coordinates");
  }
}

export async function confirmAerialSiteLocation(input: {
  actor: Actor;
  siteId: string;
  requestedOrganizationId?: string | null;
  formattedAddress: string;
  latitude: number;
  longitude: number;
}): Promise<ConfirmedAerialSiteLocation | null> {
  const siteId = input.siteId.trim();
  const organizationId = resolveOrganizationId(input.actor, input.requestedOrganizationId);
  const formattedAddress = input.formattedAddress.trim();

  if (!siteId || !organizationId || formattedAddress.length < 4) return null;
  assertCoordinateRange(input.latitude, input.longitude);

  const site = await prisma.site.findFirst({
    where: { id: siteId, organizationId },
    select: { id: true, organizationId: true },
  });
  if (!site) return null;

  const updated = await prisma.site.update({
    where: { id: site.id },
    data: {
      latitude: input.latitude,
      longitude: input.longitude,
    },
    select: { id: true, organizationId: true, latitude: true, longitude: true },
  });

  if (updated.latitude === null || updated.longitude === null) return null;
  return {
    siteId: updated.id,
    organizationId: updated.organizationId,
    formattedAddress,
    latitude: updated.latitude,
    longitude: updated.longitude,
  };
}
