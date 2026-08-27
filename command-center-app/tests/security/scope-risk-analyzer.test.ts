import assert from "node:assert/strict";
import test from "node:test";

import { analyzeScopeRisk } from "../../lib/contractor-os/scope-risk-analyzer";

test("flags quantity conflicts without mutating authoritative values", () => {
  const takeoffQuantity = 24;
  const estimateQuantity = 20;
  const findings = analyzeScopeRisk({
    quantities: [
      { source: "TAKEOFF", sourceId: "t-1", key: "CAT6-DROP", description: "CAT6 data drop", quantity: takeoffQuantity, unit: "EA", sheetReference: "T-201" },
      { source: "ESTIMATE", sourceId: "e-1", key: "CAT6-DROP", description: "CAT6 data drop", quantity: estimateQuantity, unit: "EA" },
    ],
    statements: [],
  });

  assert.equal(findings.some((finding) => finding.type === "QUANTITY_CONFLICT"), true);
  assert.equal(takeoffQuantity, 24);
  assert.equal(estimateQuantity, 20);
});

test("flags takeoff scope that has no estimate pricing representation", () => {
  const findings = analyzeScopeRisk({
    quantities: [
      { source: "TAKEOFF", sourceId: "camera-1", key: "CAMERA", description: "4K camera", quantity: 12, unit: "EA" },
    ],
    statements: [],
  });

  const finding = findings.find((row) => row.type === "UNPRICED_TAKEOFF");
  assert.ok(finding);
  assert.equal(finding.proposalSection, "RISKS");
});

test("surfaces assumptions exclusions alternates risks and missing responsibility for review", () => {
  const findings = analyzeScopeRisk({
    quantities: [],
    statements: [
      { source: "BID", sourceId: "s1", kind: "ASSUMPTION", text: "Existing pathways are reusable." },
      { source: "BID", sourceId: "s2", kind: "EXCLUSION", text: "Fire stopping by others." },
      { source: "BID", sourceId: "s3", kind: "ALTERNATE", text: "Alternate: plenum cable upgrade." },
      { source: "PROJECT", sourceId: "s4", kind: "RISK", text: "Night work window is not confirmed." },
      { source: "PROJECT", sourceId: "s5", kind: "RESPONSIBILITY", text: "Provide lift for camera installation." },
    ],
  });

  assert.deepEqual(
    new Set(findings.map((finding) => finding.type)),
    new Set(["ASSUMPTION", "EXCLUSION", "ALTERNATE", "RISK_NOTE", "MISSING_RESPONSIBILITY"]),
  );
});
