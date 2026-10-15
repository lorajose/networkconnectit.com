import assert from "node:assert/strict";
import test from "node:test";

import {
  PROFESSIONAL_PDF_STRATEGY,
  applyProfessionalDocumentAudiencePolicy,
  canonicalProfessionalDocumentJson,
  createCloseoutPdfSnapshot,
  toProfessionalPdfRenderRequest,
  verifyProfessionalDocumentSnapshot,
} from "../../lib/contractor-os/professional-document-snapshot";

test("NCI-030 canonical JSON is stable across object key order", () => {
  const first = canonicalProfessionalDocumentJson({ b: 2, a: { d: 4, c: 3 } });
  const second = canonicalProfessionalDocumentJson({ a: { c: 3, d: 4 }, b: 2 });
  assert.equal(first, second);
});

test("NCI-030 customer copy strips NCI-021/NCI-031 internal infrastructure fields", () => {
  const safe = applyProfessionalDocumentAudiencePolicy(
    {
      project: {
        internalProjectManager: "internal-owner",
        leadTechnician: "field-owner",
        salesOwner: "commercial-owner",
        remoteAccessMethod: "internal-method",
      },
      networkSegments: [{ subnetCidr: "private-segment", gatewayIp: "private-gateway" }],
      accessReferences: [{ vaultPath: "internal-reference", remoteAccessMethod: "internal-access" }],
      deviceLinks: [{ sourcePort: "source-port", targetPort: "target-port", devicePortNotes: "internal-note" }],
      summary: "Safe customer summary",
    },
    "CUSTOMER_COPY"
  );

  const serialized = JSON.stringify(safe);
  assert.equal(serialized.includes("internal-owner"), false);
  assert.equal(serialized.includes("private-segment"), false);
  assert.equal(serialized.includes("private-gateway"), false);
  assert.equal(serialized.includes("internal-reference"), false);
  assert.equal(serialized.includes("source-port"), false);
  assert.equal(serialized.includes("Safe customer summary"), true);
});

test("NCI-030 closeout snapshot is reproducible and version-bound", () => {
  const input = {
    packageVersion: 3,
    packageId: "pkg_123",
    projectName: "Bronx Site",
    generatedAt: "2026-10-11T12:30:00.000Z",
    manifest: { acceptance: { accepted: 31 }, summary: "Completed" },
    audience: "CUSTOMER_COPY" as const,
    branding: { companyName: "NetworkConnectIT", brandTagline: "Built for the field" },
  };

  const first = createCloseoutPdfSnapshot(input);
  const second = createCloseoutPdfSnapshot({ ...input, manifest: { acceptance: { accepted: 31 }, summary: "Completed" } });

  assert.equal(first.snapshotHash, second.snapshotHash);
  assert.equal(first.metadata.sourceVersion, 3);
  assert.equal(verifyProfessionalDocumentSnapshot(first), true);

  const changed = createCloseoutPdfSnapshot({ ...input, packageVersion: 4 });
  assert.notEqual(first.snapshotHash, changed.snapshotHash);
});

test("NCI-030 render request binds controlled strategy, filename and snapshot hash", () => {
  const snapshot = createCloseoutPdfSnapshot({
    packageVersion: 3,
    packageId: "pkg_123",
    projectName: "Bronx Site",
    generatedAt: "2026-10-11T12:30:00.000Z",
    manifest: { acceptance: { accepted: 31 } },
    audience: "CUSTOMER_COPY",
    branding: { companyName: "NetworkConnectIT" },
  });
  const request = toProfessionalPdfRenderRequest(snapshot);

  assert.equal(snapshot.strategy, PROFESSIONAL_PDF_STRATEGY);
  assert.equal(request.fileName, "closeout-pkg_123-v3.pdf");
  assert.equal(request.snapshotHash, snapshot.snapshotHash);
  assert.equal(verifyProfessionalDocumentSnapshot(snapshot), true);
});
