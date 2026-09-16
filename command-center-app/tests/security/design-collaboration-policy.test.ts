import assert from "node:assert/strict";
import test from "node:test";

import {
  assertDesignOrganizationBoundary,
  attributeDesignChange,
  designExportPolicy,
  effectiveDesignPermissions,
  requireDesignPermission,
} from "../../lib/contractor-os/design-collaboration-policy";

const clientAdmin = { id: "user-1", role: "CLIENT_ADMIN" as const, organizationId: "org-a" };
const viewer = { id: "user-2", role: "VIEWER" as const, organizationId: "org-a" };

test("NCI-064 blocks cross-tenant direct organization access", () => {
  assert.equal(assertDesignOrganizationBoundary(clientAdmin, "org-a"), "org-a");
  assert.throws(() => assertDesignOrganizationBoundary(clientAdmin, "org-b"), /not found/i);
  assert.throws(() => requireDesignPermission(viewer, "org-b", "VIEW"), /not found/i);
});

test("NCI-064 assigns view edit export permissions by role and group", () => {
  assert.deepEqual([...effectiveDesignPermissions(viewer)], ["VIEW"]);
  assert.equal(effectiveDesignPermissions({ ...viewer, groups: ["DESIGNER"] }).has("EDIT"), true);
  assert.equal(effectiveDesignPermissions({ ...viewer, groups: ["ESTIMATOR"] }).has("EXPORT"), true);
  assert.throws(() => requireDesignPermission(viewer, "org-a", "EDIT"), /edit permission/i);
});

test("NCI-064 allows organization admins to override group permissions", () => {
  const rules = { permissionsByGroup: { FIELD_TECHNICIAN: ["VIEW", "EDIT"] as const } };
  const actor = { ...viewer, groups: ["FIELD_TECHNICIAN" as const] };
  assert.equal(requireDesignPermission(actor, "org-a", "EDIT", rules), "org-a");
});

test("NCI-064 enforces organization branding for exports by default", () => {
  const policy = designExportPolicy(clientAdmin, "org-a");
  assert.equal(policy.organizationId, "org-a");
  assert.equal(policy.enforceOrganizationBranding, true);
});

test("NCI-064 attributes design changes to the authenticated user", () => {
  const attribution = attributeDesignChange(clientAdmin, "org-a", "EDIT", new Date("2026-09-16T12:00:00Z"));
  assert.deepEqual(attribution, {
    userId: "user-1",
    organizationId: "org-a",
    action: "EDIT",
    occurredAt: "2026-09-16T12:00:00.000Z",
  });
  assert.throws(
    () => attributeDesignChange({ role: "CLIENT_ADMIN", organizationId: "org-a" }, "org-a", "EDIT"),
    /attribution is required/i,
  );
});
