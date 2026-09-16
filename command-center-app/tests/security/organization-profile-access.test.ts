import assert from "node:assert/strict";
import test from "node:test";

import {
  organizationProfileAccess,
  requireOrganizationBrandingWriteAccess,
  requireOrganizationProfileWriteAccess,
} from "../../lib/contractor-os/organization-profile-access";

test("platform admins can manage any organization profile", () => {
  const access = organizationProfileAccess({ role: "SUPER_ADMIN" }, "org-b");
  assert.equal(access.organizationId, "org-b");
  assert.equal(access.canEditProfile, true);
  assert.equal(access.canEditBranding, true);
});

test("client admin can manage only its own organization profile", () => {
  const actor = { role: "CLIENT_ADMIN" as const, organizationId: "org-a" };
  assert.equal(requireOrganizationProfileWriteAccess(actor, "org-a"), "org-a");
  assert.equal(requireOrganizationBrandingWriteAccess(actor, "org-a"), "org-a");
  assert.throws(
    () => organizationProfileAccess(actor, "org-b"),
    /Cross-tenant organization profile access denied/,
  );
});

test("viewer can read own profile but cannot change profile or branding", () => {
  const actor = { role: "VIEWER" as const, organizationId: "org-a" };
  const access = organizationProfileAccess(actor, "org-a");
  assert.equal(access.canRead, true);
  assert.equal(access.canEditProfile, false);
  assert.equal(access.canEditBranding, false);
  assert.throws(
    () => requireOrganizationProfileWriteAccess(actor, "org-a"),
    /read-only/,
  );
  assert.throws(
    () => requireOrganizationBrandingWriteAccess(actor, "org-a"),
    /read-only/,
  );
});

test("tenant-scoped roles fail closed without organization scope", () => {
  assert.throws(
    () => organizationProfileAccess({ role: "CLIENT_ADMIN", organizationId: null }, "org-a"),
    /missing organizationId/,
  );
});
