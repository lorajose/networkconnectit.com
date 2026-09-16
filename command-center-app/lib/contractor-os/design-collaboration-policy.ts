import type { AppRole } from "../rbac";

export type DesignPermission = "VIEW" | "EDIT" | "EXPORT";
export type DesignTeamGroup = "ESTIMATOR" | "DESIGNER" | "PROJECT_MANAGER" | "FIELD_TECHNICIAN";

export type DesignCollaborationActor = {
  id?: string | null;
  role: AppRole;
  organizationId?: string | null;
  groups?: DesignTeamGroup[];
};

export type DesignCollaborationRules = {
  permissionsByRole?: Partial<Record<AppRole, readonly DesignPermission[]>>;
  permissionsByGroup?: Partial<Record<DesignTeamGroup, readonly DesignPermission[]>>;
  enforceOrganizationBrandingOnExport?: boolean;
};

const DEFAULT_ROLE_PERMISSIONS: Partial<Record<AppRole, readonly DesignPermission[]>> = {
  SUPER_ADMIN: ["VIEW", "EDIT", "EXPORT"],
  INTERNAL_ADMIN: ["VIEW", "EDIT", "EXPORT"],
  CLIENT_ADMIN: ["VIEW", "EDIT", "EXPORT"],
  VIEWER: ["VIEW"],
};

const DEFAULT_GROUP_PERMISSIONS: Record<DesignTeamGroup, readonly DesignPermission[]> = {
  ESTIMATOR: ["VIEW", "EXPORT"],
  DESIGNER: ["VIEW", "EDIT", "EXPORT"],
  PROJECT_MANAGER: ["VIEW", "EDIT", "EXPORT"],
  FIELD_TECHNICIAN: ["VIEW"],
};

function isPlatformAdmin(role: AppRole) {
  return role === "SUPER_ADMIN" || role === "INTERNAL_ADMIN";
}

export function assertDesignOrganizationBoundary(
  actor: DesignCollaborationActor,
  organizationId: string,
) {
  const requestedOrganizationId = organizationId.trim();
  if (!requestedOrganizationId) throw new Error("Organization is required");
  if (isPlatformAdmin(actor.role)) return requestedOrganizationId;
  if (!actor.organizationId || actor.organizationId !== requestedOrganizationId) {
    throw new Error("Design project not found");
  }
  return requestedOrganizationId;
}

export function effectiveDesignPermissions(
  actor: DesignCollaborationActor,
  rules: DesignCollaborationRules = {},
): Set<DesignPermission> {
  if (isPlatformAdmin(actor.role)) return new Set(["VIEW", "EDIT", "EXPORT"]);

  const permissions = new Set<DesignPermission>(
    rules.permissionsByRole?.[actor.role] ?? DEFAULT_ROLE_PERMISSIONS[actor.role] ?? [],
  );
  for (const group of actor.groups ?? []) {
    for (const permission of rules.permissionsByGroup?.[group] ?? DEFAULT_GROUP_PERMISSIONS[group]) {
      permissions.add(permission);
    }
  }
  return permissions;
}

export function requireDesignPermission(
  actor: DesignCollaborationActor,
  organizationId: string,
  permission: DesignPermission,
  rules: DesignCollaborationRules = {},
) {
  const scopedOrganizationId = assertDesignOrganizationBoundary(actor, organizationId);
  if (!effectiveDesignPermissions(actor, rules).has(permission)) {
    throw new Error(`Design ${permission.toLowerCase()} permission is required`);
  }
  return scopedOrganizationId;
}

export function designExportPolicy(
  actor: DesignCollaborationActor,
  organizationId: string,
  rules: DesignCollaborationRules = {},
) {
  const scopedOrganizationId = requireDesignPermission(actor, organizationId, "EXPORT", rules);
  return {
    organizationId: scopedOrganizationId,
    enforceOrganizationBranding: rules.enforceOrganizationBrandingOnExport !== false,
  };
}

export type DesignChangeAttribution = {
  userId: string;
  organizationId: string;
  action: "CREATE" | "EDIT" | "EXPORT" | "SHARE" | "PERMISSION_CHANGE";
  occurredAt: string;
};

export function attributeDesignChange(
  actor: DesignCollaborationActor,
  organizationId: string,
  action: DesignChangeAttribution["action"],
  occurredAt = new Date(),
): DesignChangeAttribution {
  const scopedOrganizationId = assertDesignOrganizationBoundary(actor, organizationId);
  const userId = actor.id?.trim();
  if (!userId) throw new Error("Authenticated user attribution is required");
  return { userId, organizationId: scopedOrganizationId, action, occurredAt: occurredAt.toISOString() };
}
