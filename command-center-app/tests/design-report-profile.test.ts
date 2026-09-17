import assert from "node:assert/strict";
import test from "node:test";

import {
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
