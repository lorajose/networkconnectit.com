import assert from "node:assert/strict";
import test from "node:test";

import {
  createIssuedDesignReportSnapshot,
  DEFAULT_CLIENT_DESIGN_REPORT_PROFILE,
  filterReportElementsByLayer,
  reportIncludesSection,
  resolveDesignReportProfile,
} from "../lib/contractor-os/design-report-profile";

test("client-safe reports never expose pricing", () => {
  const profile = resolveDesignReportProfile({ clientSafe: true, includePricing: true, sections: ["COVER", "PRICING_SUMMARY"] });
  assert.equal(profile.includePricing, false);
  assert.equal(reportIncludesSection(profile, "PRICING_SUMMARY"), false);
  assert.deepEqual(profile.sections, ["COVER"]);
});

test("internal reports can explicitly include pricing", () => {
  const profile = resolveDesignReportProfile({ clientSafe: false, includePricing: true, sections: ["COVER", "PRICING_SUMMARY"] });
  assert.equal(reportIncludesSection(profile, "PRICING_SUMMARY"), true);
});

test("default client report contains customer-ready non-pricing sections", () => {
  assert.deepEqual(DEFAULT_CLIENT_DESIGN_REPORT_PROFILE.sections, ["COVER", "FLOOR_PLANS", "CAMERA_COVERAGE", "BOM", "CABLE_SCHEDULE"]);
});

test("visible layer selection filters report elements", () => {
  const profile = resolveDesignReportProfile({ visibleLayerIds: ["cctv"] });
  const elements = [{ id: "camera-1", layerId: "cctv" }, { id: "door-1", layerId: "access" }, { id: "legacy", layerId: null }];
  assert.deepEqual(filterReportElementsByLayer(elements, profile).map((element) => element.id), ["camera-1", "legacy"]);
});

test("issued report snapshots pin design revision and proposal/estimate evidence", () => {
  const snapshot = createIssuedDesignReportSnapshot({
    issuedByUserId: "user-1",
    organizationId: "org-a",
    designProjectId: "design-1",
    designRevision: 7,
    estimateId: "estimate-4",
    proposalId: "proposal-9",
    profile: { clientSafe: true, includePricing: true, sections: ["COVER", "PRICING_SUMMARY"] },
    evidence: { floorIds: ["floor-1"], bomRevision: 3 },
    issuedAt: new Date("2026-09-16T16:00:00Z"),
  });

  assert.equal(snapshot.status, "ISSUED");
  assert.equal(snapshot.designRevision, 7);
  assert.equal(snapshot.estimateId, "estimate-4");
  assert.equal(snapshot.proposalId, "proposal-9");
  assert.equal(snapshot.profile.includePricing, false);
  assert.equal(snapshot.profile.sections.includes("PRICING_SUMMARY"), false);
  assert.match(snapshot.evidenceHash, /^[a-f0-9]{64}$/);
  assert.equal(Object.isFrozen(snapshot), true);
});

test("issued report evidence hash changes when linked evidence changes", () => {
  const base = {
    issuedByUserId: "user-1",
    organizationId: "org-a",
    designProjectId: "design-1",
    designRevision: 2,
    issuedAt: new Date("2026-09-16T16:00:00Z"),
  };
  const first = createIssuedDesignReportSnapshot({ ...base, evidence: { bomRevision: 1 } });
  const second = createIssuedDesignReportSnapshot({ ...base, evidence: { bomRevision: 2 } });
  assert.notEqual(first.evidenceHash, second.evidenceHash);
});
