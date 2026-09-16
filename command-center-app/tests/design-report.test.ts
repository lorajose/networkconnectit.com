import assert from "node:assert/strict";
import test from "node:test";

import { createCanvasDocument } from "../lib/contractor-os/design-canvas-state";
import { buildDesignReportData } from "../lib/contractor-os/design-report";

const floor = {
  id: "floor-1",
  name: "Level 1",
  document: createCanvasDocument([
    {
      id: "camera-1",
      kind: "DEVICE" as const,
      discipline: "CCTV",
      category: "CAMERA",
      geometry: { x: 10, y: 10, width: 20, height: 20, rotation: 0 },
      locked: false,
      hidden: false,
    },
    {
      id: "cable-1",
      kind: "CABLE_PATH" as const,
      discipline: "PATHWAY",
      category: "CABLE_ROUTE",
      geometry: { points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] },
      cableRoute: { cableType: "CAT6", slackPercent: 0, serviceLoopFeet: 0 },
      locked: false,
      hidden: false,
    },
  ]),
};

test("NCI-065 composes floor, BOM and cable schedule from the same design source", () => {
  const report = buildDesignReportData({ floors: [floor] });
  assert.equal(report.floors.length, 1);
  assert.equal(report.bom.some((item) => item.category === "CAMERA"), true);
  assert.equal(report.cableSchedule.length, 1);
  assert.equal(report.cableSchedule[0]?.floorName, "Level 1");
  assert.equal(report.pricingSummary, undefined);
});

test("NCI-065 client-safe report cannot expose pricing even when requested", () => {
  const report = buildDesignReportData({
    floors: [floor],
    profile: { clientSafe: true, includePricing: true, sections: ["BOM", "PRICING_SUMMARY"] },
    pricing: { materialUnitCostByKey: { "CCTV:CAMERA": 125 } },
  });
  assert.equal(report.pricingSummary, undefined);
});

test("NCI-065 internal report can include calculated pricing summary", () => {
  const report = buildDesignReportData({
    floors: [floor],
    profile: { clientSafe: false, includePricing: true, sections: ["BOM", "PRICING_SUMMARY"] },
    pricing: { materialUnitCostByKey: { "CCTV:CAMERA": 125 } },
  });
  assert.ok(report.pricingSummary);
});
