import assert from "node:assert/strict";
import test from "node:test";

import {
  commercialReadScope,
  requireCommercialWriteAccess,
} from "../../lib/contractor-os/commercial-access";

test("client admin bid writes stay inside its organization", () => {
  assert.equal(
    requireCommercialWriteAccess(
      { role: "CLIENT_ADMIN", organizationId: "org-a" },
      "org-a",
    ),
    "org-a",
  );

  assert.throws(
    () => requireCommercialWriteAccess(
      { role: "CLIENT_ADMIN", organizationId: "org-a" },
      "org-b",
    ),
    /Cross-tenant commercial write denied/,
  );
});

test("tenant bid reads fail closed without tenant identity", () => {
  assert.throws(
    () => commercialReadScope({ role: "CLIENT_ADMIN", organizationId: null }),
    /missing organizationId/,
  );
});

test("viewer cannot modify bid intake records", () => {
  assert.throws(
    () => requireCommercialWriteAccess(
      { role: "VIEWER", organizationId: "org-a" },
      "org-a",
    ),
    /VIEWER cannot modify commercial records/,
  );
});
