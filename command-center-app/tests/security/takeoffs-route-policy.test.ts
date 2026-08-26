import assert from "node:assert/strict";
import test from "node:test";

import { hasRequiredRole, routeAccess } from "../../lib/rbac";

test("takeoff workspace is available to contractor/admin roles", () => {
  assert.equal(hasRequiredRole("SUPER_ADMIN", routeAccess.takeoffs), true);
  assert.equal(hasRequiredRole("INTERNAL_ADMIN", routeAccess.takeoffs), true);
  assert.equal(hasRequiredRole("CLIENT_ADMIN", routeAccess.takeoffs), true);
});

test("viewer cannot enter takeoff workspace", () => {
  assert.equal(hasRequiredRole("VIEWER", routeAccess.takeoffs), false);
});
