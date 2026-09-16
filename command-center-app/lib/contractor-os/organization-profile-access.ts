import type { AppRole } from "../rbac";

export type OrganizationProfileActor = {
  role: AppRole;
  organizationId?: string | null;
};

export type OrganizationProfileAccess = {
  organizationId: string;
  canRead: true;
  canEditProfile: boolean;
  canEditBranding: boolean;
};

function isPlatformAdmin(role: AppRole) {
  return role === "SUPER_ADMIN" || role === "INTERNAL_ADMIN";
}

export function organizationProfileAccess(
  actor: OrganizationProfileActor,
  requestedOrganizationId: string,
): OrganizationProfileAccess {
  if (!requestedOrganizationId) {
    throw new Error("Organization is required");
  }

  if (isPlatformAdmin(actor.role)) {
    return {
      organizationId: requestedOrganizationId,
      canRead: true,
      canEditProfile: true,
      canEditBranding: true,
    };
  }

  if (!actor.organizationId) {
    throw new Error("Tenant-scoped actor is missing organizationId");
  }

  if (actor.organizationId !== requestedOrganizationId) {
    throw new Error("Cross-tenant organization profile access denied");
  }

  const canEdit = actor.role === "CLIENT_ADMIN";
  return {
    organizationId: actor.organizationId,
    canRead: true,
    canEditProfile: canEdit,
    canEditBranding: canEdit,
  };
}

export function requireOrganizationProfileWriteAccess(
  actor: OrganizationProfileActor,
  requestedOrganizationId: string,
) {
  const access = organizationProfileAccess(actor, requestedOrganizationId);
  if (!access.canEditProfile) {
    throw new Error("Organization profile is read-only for this role");
  }
  return access.organizationId;
}

export function requireOrganizationBrandingWriteAccess(
  actor: OrganizationProfileActor,
  requestedOrganizationId: string,
) {
  const access = organizationProfileAccess(actor, requestedOrganizationId);
  if (!access.canEditBranding) {
    throw new Error("Organization branding is read-only for this role");
  }
  return access.organizationId;
}
