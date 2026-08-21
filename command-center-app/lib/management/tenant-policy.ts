import { isCommandCenterAdminRole, type AppRole } from "../rbac";

export type TenantUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  role: AppRole;
  organizationId: string | null;
};

export const NEVER_MATCHING_TENANT_ID = "__no_tenant_scope__";

export function isGlobalAccessUser(user: TenantUser) {
  return isCommandCenterAdminRole(user.role);
}

export function canAccessOrganization(user: TenantUser, organizationId: string) {
  return isGlobalAccessUser(user) || user.organizationId === organizationId;
}

export function getScopedOrganizationWhere(user: TenantUser) {
  if (isGlobalAccessUser(user)) {
    return {};
  }

  return {
    id: user.organizationId ?? NEVER_MATCHING_TENANT_ID
  };
}

export function getScopedRecordWhere(user: TenantUser) {
  if (isGlobalAccessUser(user)) {
    return {};
  }

  return {
    organizationId: user.organizationId ?? NEVER_MATCHING_TENANT_ID
  };
}

export function resolveWritableOrganizationId(
  user: TenantUser,
  organizationId: string | null | undefined
) {
  if (isGlobalAccessUser(user)) {
    return organizationId ?? null;
  }

  return user.organizationId;
}
