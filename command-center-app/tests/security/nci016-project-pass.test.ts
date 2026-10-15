import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveProjectPassEntitlement,
  hasProjectPassEntitlement,
  type ProjectPassPaymentRecord
} from "../../lib/contractor-os/project-pass";

function payment(
  overrides: Partial<ProjectPassPaymentRecord> = {}
): ProjectPassPaymentRecord {
  return {
    id: "pay-1",
    organizationId: "org-a",
    projectInstallationId: "project-a",
    product: "CCTV_DIAGRAM_EXPORT",
    provider: "TEST_PROVIDER",
    providerPaymentId: "provider-pay-1",
    state: "PENDING",
    amountCents: 2500,
    currency: "usd",
    verifiedAt: null,
    ...overrides
  };
}

test("NCI-016 does not grant Project Pass from an unverified or pending payment", () => {
  assert.equal(deriveProjectPassEntitlement(payment()), null);
  assert.equal(
    deriveProjectPassEntitlement(payment({ state: "PAID", verifiedAt: null })),
    null
  );
});

test("NCI-016 grants only a server-verified paid entitlement", () => {
  const entitlement = deriveProjectPassEntitlement(
    payment({
      state: "PAID",
      verifiedAt: "2026-10-04T14:00:00.000Z"
    })
  );

  assert.ok(entitlement);
  assert.equal(entitlement.organizationId, "org-a");
  assert.equal(entitlement.projectInstallationId, "project-a");
  assert.equal(entitlement.product, "CCTV_DIAGRAM_EXPORT");
  assert.equal(entitlement.paymentId, "pay-1");
});

test("NCI-016 entitlement is bound to tenant, project and product", () => {
  const entitlement = deriveProjectPassEntitlement(
    payment({
      state: "PAID",
      verifiedAt: "2026-10-04T14:00:00.000Z"
    })
  );

  assert.equal(
    hasProjectPassEntitlement(entitlement, {
      organizationId: "org-a",
      projectInstallationId: "project-a",
      product: "CCTV_DIAGRAM_EXPORT"
    }),
    true
  );
  assert.equal(
    hasProjectPassEntitlement(entitlement, {
      organizationId: "org-b",
      projectInstallationId: "project-a",
      product: "CCTV_DIAGRAM_EXPORT"
    }),
    false
  );
  assert.equal(
    hasProjectPassEntitlement(entitlement, {
      organizationId: "org-a",
      projectInstallationId: "project-b",
      product: "CCTV_DIAGRAM_EXPORT"
    }),
    false
  );
});

test("NCI-016 rejects invalid payment facts instead of trusting client-shaped input", () => {
  assert.throws(
    () =>
      deriveProjectPassEntitlement(
        payment({
          state: "PAID",
          verifiedAt: "not-a-date"
        })
      ),
    /timestamp/
  );

  assert.throws(
    () =>
      deriveProjectPassEntitlement(
        payment({
          amountCents: 25.5
        })
      ),
    /integer/
  );
});
