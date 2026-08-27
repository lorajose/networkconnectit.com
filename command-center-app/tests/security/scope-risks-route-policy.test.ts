import assert from "node:assert/strict";
import test from "node:test";

import { hasRequiredRole, routeAccess } from "../../lib/rbac";

test("scope risk workspace is available to contractor/admin roles", () => {
  assert.equal(hasRequiredRole("SUPER_ADMIN", routeAccess.scopeRisks), true);
  assert.equal(hasRequiredRole("INTERNAL_ADMIN", routeAccess.scopeRisks), true);
  assert.equal(hasRequiredRole("CLIENT_ADMIN", routeAccess.scopeRisks), true);
});

test("viewer cannot enter scope risk workspace", () => {
  assert.equal(hasRequiredRole("VIEWER", routeAccess.scopeRisks), false);
});
