import assert from "node:assert/strict";
import test from "node:test";

import { hasRequiredRole, routeAccess } from "../../lib/rbac";

test("Design Studio is available to contractor and admin roles", () => {
  assert.equal(hasRequiredRole("SUPER_ADMIN", routeAccess.designStudio), true);
  assert.equal(hasRequiredRole("INTERNAL_ADMIN", routeAccess.designStudio), true);
  assert.equal(hasRequiredRole("CLIENT_ADMIN", routeAccess.designStudio), true);
});

test("viewer cannot edit in Design Studio", () => {
  assert.equal(hasRequiredRole("VIEWER", routeAccess.designStudio), false);
});
