import { describe, expect, it } from "vitest";

import { hasRequiredRole, routeAccess } from "../../lib/rbac";

describe("takeoff route policy", () => {
  it("allows commercial editors", () => {
    expect(hasRequiredRole("SUPER_ADMIN", routeAccess.takeoffs)).toBe(true);
    expect(hasRequiredRole("INTERNAL_ADMIN", routeAccess.takeoffs)).toBe(true);
    expect(hasRequiredRole("CLIENT_ADMIN", routeAccess.takeoffs)).toBe(true);
  });

  it("keeps viewer read-only users out of takeoff editing", () => {
    expect(hasRequiredRole("VIEWER", routeAccess.takeoffs)).toBe(false);
  });
});
