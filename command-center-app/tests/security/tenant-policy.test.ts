import assert from "node:assert/strict";
import test from "node:test";

import {
  canAcknowledgeAlerts,
  canManageOrganizations,
  canResolveAlerts,
  canRunHealthSimulation,
  canWriteTenantInventory,
  isCommandCenterAdminRole,
  isReadOnlyRole,
  isTenantScopedRole,
  type AppRole
} from "../../lib/rbac";
import {
  NEVER_MATCHING_TENANT_ID,
  canAccessOrganization,
  getScopedOrganizationWhere,
  getScopedRecordWhere,
  isGlobalAccessUser,
  resolveWritableOrganizationId,
  type TenantUser
} from "../../lib/management/tenant-policy";

const roles: AppRole[] = [
  "SUPER_ADMIN",
  "INTERNAL_ADMIN",
  "CLIENT_ADMIN",
  "VIEWER"
];

function tenantUser(role: AppRole, organizationId: string | null = "org-a"): TenantUser {
  return { role, organizationId };
}

test("RBAC: only internal command-center admins have global access", () => {
  assert.equal(isCommandCenterAdminRole("SUPER_ADMIN"), true);
  assert.equal(isCommandCenterAdminRole("INTERNAL_ADMIN"), true);
  assert.equal(isCommandCenterAdminRole("CLIENT_ADMIN"), false);
  assert.equal(isCommandCenterAdminRole("VIEWER"), false);
});

test("RBAC: tenant scoped roles remain CLIENT_ADMIN and VIEWER", () => {
  assert.equal(isTenantScopedRole("SUPER_ADMIN"), false);
  assert.equal(isTenantScopedRole("INTERNAL_ADMIN"), false);
  assert.equal(isTenantScopedRole("CLIENT_ADMIN"), true);
  assert.equal(isTenantScopedRole("VIEWER"), true);
});

test("RBAC: organization management is restricted to global admins", () => {
  for (const role of roles) {
    assert.equal(
      canManageOrganizations(role),
      role === "SUPER_ADMIN" || role === "INTERNAL_ADMIN"
    );
  }
});

test("RBAC: VIEWER cannot mutate tenant inventory", () => {
  assert.equal(canWriteTenantInventory("SUPER_ADMIN"), true);
  assert.equal(canWriteTenantInventory("INTERNAL_ADMIN"), true);
  assert.equal(canWriteTenantInventory("CLIENT_ADMIN"), true);
  assert.equal(canWriteTenantInventory("VIEWER"), false);
  assert.equal(isReadOnlyRole("VIEWER"), true);
});

test("RBAC: alert permissions do not widen accidentally", () => {
  assert.equal(canAcknowledgeAlerts("SUPER_ADMIN"), true);
  assert.equal(canAcknowledgeAlerts("INTERNAL_ADMIN"), true);
  assert.equal(canAcknowledgeAlerts("CLIENT_ADMIN"), true);
  assert.equal(canAcknowledgeAlerts("VIEWER"), false);

  assert.equal(canResolveAlerts("SUPER_ADMIN"), true);
  assert.equal(canResolveAlerts("INTERNAL_ADMIN"), true);
  assert.equal(canResolveAlerts("CLIENT_ADMIN"), false);
  assert.equal(canResolveAlerts("VIEWER"), false);
});

test("RBAC: health simulation remains internal-only", () => {
  assert.equal(canRunHealthSimulation("SUPER_ADMIN"), true);
  assert.equal(canRunHealthSimulation("INTERNAL_ADMIN"), true);
  assert.equal(canRunHealthSimulation("CLIENT_ADMIN"), false);
  assert.equal(canRunHealthSimulation("VIEWER"), false);
});

test("tenant isolation: global admins can access any organization", () => {
  assert.equal(isGlobalAccessUser(tenantUser("SUPER_ADMIN")), true);
  assert.equal(isGlobalAccessUser(tenantUser("INTERNAL_ADMIN")), true);
  assert.equal(canAccessOrganization(tenantUser("SUPER_ADMIN"), "org-z"), true);
  assert.equal(canAccessOrganization(tenantUser("INTERNAL_ADMIN"), "org-z"), true);
});

test("tenant isolation: client roles can access only their own organization", () => {
  const clientAdmin = tenantUser("CLIENT_ADMIN", "org-a");
  const viewer = tenantUser("VIEWER", "org-a");

  assert.equal(canAccessOrganization(clientAdmin, "org-a"), true);
  assert.equal(canAccessOrganization(clientAdmin, "org-b"), false);
  assert.equal(canAccessOrganization(viewer, "org-a"), true);
  assert.equal(canAccessOrganization(viewer, "org-b"), false);
});

test("tenant isolation: missing tenant identity is fail-closed", () => {
  const clientAdmin = tenantUser("CLIENT_ADMIN", null);
  const viewer = tenantUser("VIEWER", null);

  assert.deepEqual(getScopedOrganizationWhere(clientAdmin), {
    id: NEVER_MATCHING_TENANT_ID
  });
  assert.deepEqual(getScopedRecordWhere(viewer), {
    organizationId: NEVER_MATCHING_TENANT_ID
  });
  assert.equal(canAccessOrganization(clientAdmin, "org-a"), false);
});

test("tenant isolation: scoped query filters cannot escape tenant", () => {
  assert.deepEqual(getScopedOrganizationWhere(tenantUser("CLIENT_ADMIN", "org-a")), {
    id: "org-a"
  });
  assert.deepEqual(getScopedRecordWhere(tenantUser("VIEWER", "org-a")), {
    organizationId: "org-a"
  });
  assert.deepEqual(getScopedOrganizationWhere(tenantUser("SUPER_ADMIN")), {});
  assert.deepEqual(getScopedRecordWhere(tenantUser("INTERNAL_ADMIN")), {});
});

test("tenant isolation: tenant users cannot choose a foreign writable organization", () => {
  assert.equal(
    resolveWritableOrganizationId(tenantUser("CLIENT_ADMIN", "org-a"), "org-b"),
    "org-a"
  );
  assert.equal(
    resolveWritableOrganizationId(tenantUser("VIEWER", "org-a"), "org-b"),
    "org-a"
  );
  assert.equal(
    resolveWritableOrganizationId(tenantUser("SUPER_ADMIN"), "org-b"),
    "org-b"
  );
  assert.equal(resolveWritableOrganizationId(tenantUser("SUPER_ADMIN"), null), null);
});
