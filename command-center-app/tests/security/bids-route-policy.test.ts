import assert from "node:assert/strict";
import test from "node:test";

import { hasRequiredRole, routeAccess } from "../../lib/rbac";

test("bid workspace is available to contractor/admin roles", () => {
  assert.equal(hasRequiredRole("SUPER_ADMIN", routeAccess.bids), true);
  assert.equal(hasRequiredRole("INTERNAL_ADMIN", routeAccess.bids), true);
  assert.equal(hasRequiredRole("CLIENT_ADMIN", routeAccess.bids), true);
});

test("viewer cannot enter bid workspace", () => {
  assert.equal(hasRequiredRole("VIEWER", routeAccess.bids), false);
});
