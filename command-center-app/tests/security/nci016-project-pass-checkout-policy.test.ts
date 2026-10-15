import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProjectPassCheckoutRequest,
  requireTrustedProjectPassReturnUrl,
} from "../../lib/contractor-os/project-pass-checkout-policy";

const trustedOrigins = new Set(["https://app.networkconnectit.com"]);

function intent() {
  return {
    organizationId: "org-a",
    projectInstallationId: "project-a",
    product: "CCTV_DIAGRAM_EXPORT" as const,
    successUrl: "https://app.networkconnectit.com/project-pass/success",
    cancelUrl: "https://app.networkconnectit.com/project-pass/cancel",
  };
}

test("NCI-016 checkout uses server-owned catalog terms and exposes no caller price input", () => {
  const request = buildProjectPassCheckoutRequest(intent(), { trustedOrigins });

  assert.equal(request.product, "CCTV_DIAGRAM_EXPORT");
  assert.equal(request.amountCents, 1900);
  assert.equal(request.currency, "USD");
  assert.equal(request.organizationId, "org-a");
  assert.equal(request.projectInstallationId, "project-a");
});

test("NCI-016 rejects malicious checkout return origins", () => {
  assert.throws(
    () =>
      buildProjectPassCheckoutRequest(
        {
          ...intent(),
          successUrl: "https://evil.example/paid",
        },
        { trustedOrigins }
      ),
    /origin is not allowed/
  );

  assert.throws(
    () =>
      buildProjectPassCheckoutRequest(
        {
          ...intent(),
          cancelUrl: "https://app.networkconnectit.com.evil.example/cancel",
        },
        { trustedOrigins }
      ),
    /origin is not allowed/
  );
});

test("NCI-016 rejects non-http return URLs and fails closed with no trusted origins", () => {
  assert.throws(
    () =>
      requireTrustedProjectPassReturnUrl(
        "javascript:alert(1)",
        "successUrl",
        trustedOrigins
      ),
    /must use http or https/
  );

  assert.throws(
    () =>
      buildProjectPassCheckoutRequest(intent(), {
        trustedOrigins: new Set(),
      }),
    /origin is not allowed/
  );
});

test("NCI-016 accepts paths and query strings only when the exact origin is trusted", () => {
  const request = buildProjectPassCheckoutRequest(
    {
      ...intent(),
      successUrl:
        "https://app.networkconnectit.com/project-pass/success?project=project-a",
    },
    { trustedOrigins }
  );

  assert.equal(
    request.successUrl,
    "https://app.networkconnectit.com/project-pass/success?project=project-a"
  );
});
