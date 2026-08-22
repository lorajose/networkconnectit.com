import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCommercialProjectBelongsToTenant,
  commercialReadScope,
  requireCommercialWriteAccess,
} from "../../lib/contractor-os/commercial-access";

test("CLIENT_ADMIN can only read its own commercial tenant", () => {
  assert.deepEqual(commercialReadScope({ role: "CLIENT_ADMIN", organizationId: "org-a" }), { organizationId: "org-a" });
  assert.throws(
    () => commercialReadScope({ role: "CLIENT_ADMIN", organizationId: "org-a" }, "org-b"),
    /Cross-tenant commercial read denied/,
  );
});

test("CLIENT_ADMIN can only write its own commercial tenant", () => {
  assert.equal(requireCommercialWriteAccess({ role: "CLIENT_ADMIN", organizationId: "org-a" }, "org-a"), "org-a");
  assert.throws(
    () => requireCommercialWriteAccess({ role: "CLIENT_ADMIN", organizationId: "org-a" }, "org-b"),
    /Cross-tenant commercial write denied/,
  );
});

test("VIEWER cannot modify estimates or proposals", () => {
  assert.throws(
    () => requireCommercialWriteAccess({ role: "VIEWER", organizationId: "org-a" }, "org-a"),
    /VIEWER cannot modify commercial records/,
  );
});

test("tenant actors fail closed without organizationId", () => {
  assert.throws(() => commercialReadScope({ role: "CLIENT_ADMIN" }), /missing organizationId/);
  assert.throws(() => requireCommercialWriteAccess({ role: "CLIENT_ADMIN" }, "org-a"), /missing organizationId/);
});

test("project linkage cannot cross organizations", () => {
  assert.doesNotThrow(() => assertCommercialProjectBelongsToTenant("org-a", { organizationId: "org-a" }));
  assert.throws(
    () => assertCommercialProjectBelongsToTenant("org-a", { organizationId: "org-b" }),
    /does not belong/,
  );
});
