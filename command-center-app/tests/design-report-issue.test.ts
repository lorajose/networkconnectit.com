import assert from "node:assert/strict";
import test from "node:test";

import { issueDesignReportManifest, verifyIssuedDesignReportSource } from "../lib/contractor-os/design-report-issue";
import { resolveDesignReportProfile } from "../lib/contractor-os/design-report-profile";

const profile = resolveDesignReportProfile({ clientSafe: true });

test("issued design report binds revision, issuer, evidence and source digest", () => {
  const source = { floors: [{ id: "floor-1", devices: 4 }], bom: [{ key: "camera", quantity: 4 }] };
  const manifest = issueDesignReportManifest({
    organizationId: "org-a",
    designProjectId: "design-1",
    designRevision: 7,
    issuedAt: new Date("2026-09-16T20:00:00Z"),
    issuedByUserId: "user-1",
    profile,
    evidence: { estimateId: "estimate-9", proposalId: "proposal-3" },
    sourceSnapshot: source,
  });

  assert.equal(manifest.designRevision, 7);
  assert.equal(manifest.immutable, true);
  assert.deepEqual(manifest.evidence, { estimateId: "estimate-9", proposalId: "proposal-3" });
  assert.equal(verifyIssuedDesignReportSource(manifest, source), true);
  assert.equal(verifyIssuedDesignReportSource(manifest, { ...source, bom: [{ key: "camera", quantity: 5 }] }), false);
});

test("issued report id is deterministic for the same immutable issue event", () => {
  const input = {
    organizationId: "org-a",
    designProjectId: "design-1",
    designRevision: 2,
    issuedAt: new Date("2026-09-16T20:00:00Z"),
    issuedByUserId: "user-1",
    profile,
    sourceSnapshot: { revision: 2 },
  };

  assert.equal(issueDesignReportManifest(input).id, issueDesignReportManifest(input).id);
});

test("issued report requires authenticated issuer and valid revision", () => {
  assert.throws(
    () => issueDesignReportManifest({ organizationId: "org-a", designProjectId: "design-1", designRevision: 0, issuedByUserId: "user-1", profile, sourceSnapshot: {} }),
    /revision/i,
  );
  assert.throws(
    () => issueDesignReportManifest({ organizationId: "org-a", designProjectId: "design-1", designRevision: 1, issuedByUserId: "", profile, sourceSnapshot: {} }),
    /issuer/i,
  );
});
