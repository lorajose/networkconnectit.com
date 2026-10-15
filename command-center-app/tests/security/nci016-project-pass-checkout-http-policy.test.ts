import assert from "node:assert/strict";
import test from "node:test";

import { validateProjectPassCheckoutHttpInput } from "../../lib/contractor-os/project-pass-checkout-http-policy";

test("checkout HTTP policy falls back to the authenticated tenant", () => {
  const result = validateProjectPassCheckoutHttpInput(
    {
      projectInstallationId: "  project-a  ",
      product: "CCTV_DIAGRAM_EXPORT",
    },
    "  org-authenticated  "
  );

  assert.deepEqual(result, {
    ok: true,
    input: {
      organizationId: "org-authenticated",
      projectInstallationId: "project-a",
      product: "CCTV_DIAGRAM_EXPORT",
    },
  });
});

test("checkout HTTP policy rejects missing or unsupported project intent", () => {
  for (const body of [
    { product: "CCTV_DIAGRAM_EXPORT" },
    { projectInstallationId: "project-a" },
    { projectInstallationId: "project-a", product: "PREMIUM_UNLOCK" },
    { projectInstallationId: "   ", product: "CCTV_DIAGRAM_EXPORT" },
  ]) {
    const result = validateProjectPassCheckoutHttpInput(body, "org-a");
    assert.equal(result.ok, false);
    if (result.ok) {
      assert.fail("Invalid checkout intent must fail closed");
    }
    assert.equal(result.status, 400);
  }
});

test("checkout HTTP policy returns only the validated checkout contract", () => {
  const result = validateProjectPassCheckoutHttpInput(
    {
      organizationId: "org-a",
      projectInstallationId: "project-a",
      product: "CCTV_DIAGRAM_EXPORT",
      amountCents: 1,
      currency: "XXX",
      successUrl: "https://evil.example/success",
      cancelUrl: "https://evil.example/cancel",
      authorized: true,
      entitlement: "granted",
    } as Record<string, unknown>,
    "org-authenticated"
  );

  assert.deepEqual(result, {
    ok: true,
    input: {
      organizationId: "org-a",
      projectInstallationId: "project-a",
      product: "CCTV_DIAGRAM_EXPORT",
    },
  });

  if (!result.ok) {
    assert.fail("Valid checkout intent should pass");
  }

  assert.equal("amountCents" in result.input, false);
  assert.equal("currency" in result.input, false);
  assert.equal("successUrl" in result.input, false);
  assert.equal("cancelUrl" in result.input, false);
  assert.equal("authorized" in result.input, false);
  assert.equal("entitlement" in result.input, false);
});

test("checkout HTTP policy fails closed when neither request nor auth supplies a tenant", () => {
  const result = validateProjectPassCheckoutHttpInput(
    {
      projectInstallationId: "project-a",
      product: "CCTV_DIAGRAM_EXPORT",
    },
    null
  );

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail("Checkout without tenant context must fail closed");
  }
  assert.equal(result.status, 400);
});
