import type { Prisma } from "@prisma/client";
import { notFound, redirect } from "next/navigation";

import type { AppRole } from "@/lib/rbac";
import {
  canManageOrganizations,
  canWriteTenantInventory,
  isCommandCenterAdminRole
} from "@/lib/rbac";

export type TenantUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  role: AppRole;
  organizationId: string | null;
};

const NEVER_MATCHING_ID = "__no_tenant_scope__";

export function isGlobalAccessUser(user: TenantUser) {
  return isCommandCenterAdminRole(user.role);
}

export function canAccessOrganization(user: TenantUser, organizationId: string) {
  return isGlobalAccessUser(user) || user.organizationId === organizationId;
}

export function getScopedOrganizationWhere(
  user: TenantUser
): Prisma.OrganizationWhereInput {
  if (isGlobalAccessUser(user)) {
    return {};
  }

  return {
    id: user.organizationId ?? NEVER_MATCHING_ID
  };
}

export function getScopedRecordWhere(user: TenantUser) {
  if (isGlobalAccessUser(user)) {
    return {};
  }

  return {
    organizationId: user.organizationId ?? NEVER_MATCHING_ID
  };
}

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

export function resolveWritableOrganizationId(
  user: TenantUser,
  organizationId: string | null | undefined
) {
  if (isGlobalAccessUser(user)) {
    if (!organizationId) {
      return null;
    }

    return organizationId;
  }

  return user.organizationId;
}
