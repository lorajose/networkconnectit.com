import assert from "node:assert/strict";
import test from "node:test";

import { decideProjectPassCheckoutRoute } from "../../lib/contractor-os/project-pass-checkout-route-policy";

const input = {
  organizationId: "org-a",
  projectInstallationId: "project-a",
  product: "CCTV_DIAGRAM_EXPORT" as const,
};

test("Project Pass checkout fails closed when no payment provider is configured", () => {
  const decision = decideProjectPassCheckoutRoute(input, {
    configured: false,
    reason: "PROVIDER_NOT_CONFIGURED",
  });

  assert.deepEqual(decision, {
    allowed: false,
    status: 503,
    code: "PROVIDER_NOT_CONFIGURED",
    message: "Project Pass checkout is not configured yet.",
  });
  assert.equal("input" in decision, false);
});

test("Project Pass checkout policy allows validated intent only after provider configuration", () => {
  const decision = decideProjectPassCheckoutRoute(input, { configured: true });

  assert.equal(decision.allowed, true);
  if (!decision.allowed) {
    assert.fail("Configured provider should allow the validated checkout intent");
  }

  assert.deepEqual(decision.input, input);
});
