import { notFound, redirect } from "next/navigation";

import {
  canManageOrganizations,
  canWriteTenantInventory
} from "@/lib/rbac";
import {
  canAccessOrganization,
  getScopedOrganizationWhere,
  getScopedRecordWhere,
  isGlobalAccessUser,
  resolveWritableOrganizationId,
  type TenantUser
} from "@/lib/management/tenant-policy";

export {
  canAccessOrganization,
  getScopedOrganizationWhere,
  getScopedRecordWhere,
  isGlobalAccessUser,
  resolveWritableOrganizationId
} from "@/lib/management/tenant-policy";
export type { TenantUser } from "@/lib/management/tenant-policy";

export function requireOrganizationManagementAccess(user: TenantUser) {
  if (!canManageOrganizations(user.role)) {
    redirect("/organizations");
  }

  return user;
}

export function requireInventoryWriteAccess(user: TenantUser) {
  if (!canWriteTenantInventory(user.role)) {
    redirect("/dashboard");
  }

  if (!isGlobalAccessUser(user) && !user.organizationId) {
    notFound();
  }

  return user;
}

export function assertAccessibleOrganization(
  user: TenantUser,
  organizationId: string
) {
  if (!canAccessOrganization(user, organizationId)) {
    notFound();
  }
}
