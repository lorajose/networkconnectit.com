import type { AppRole } from "../rbac";

export type CommercialActor = {
  role: AppRole;
  organizationId?: string | null;
};

export type CommercialScope = {
  organizationId: string;
  projectInstallationId?: string;
};

export function requireCommercialWriteAccess(actor: CommercialActor, requestedOrganizationId: string) {
  if (actor.role === "VIEWER") {
    throw new Error("VIEWER cannot modify commercial records");
  }

  if (actor.role === "CLIENT_ADMIN") {
    if (!actor.organizationId) {
      throw new Error("Tenant-scoped actor is missing organizationId");
    }
    if (actor.organizationId !== requestedOrganizationId) {
      throw new Error("Cross-tenant commercial write denied");
    }
  }

  return requestedOrganizationId;
}

export function commercialReadScope(actor: CommercialActor, requestedOrganizationId?: string): CommercialScope {
  if (actor.role === "CLIENT_ADMIN" || actor.role === "VIEWER") {
    if (!actor.organizationId) {
      throw new Error("Tenant-scoped actor is missing organizationId");
    }
    if (requestedOrganizationId && requestedOrganizationId !== actor.organizationId) {
      throw new Error("Cross-tenant commercial read denied");
    }
    return { organizationId: actor.organizationId };
  }

  if (!requestedOrganizationId) {
    throw new Error("Admin commercial reads must select an organization");
  }

  return { organizationId: requestedOrganizationId };
}

export function assertCommercialProjectBelongsToTenant(
  organizationId: string,
  project: { organizationId: string } | null | undefined,
) {
  if (!project || project.organizationId !== organizationId) {
    throw new Error("Project does not belong to the selected organization");
  }
}
