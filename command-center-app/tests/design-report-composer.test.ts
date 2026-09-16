import assert from "node:assert/strict";
import test from "node:test";

import { createCanvasDocument } from "../lib/contractor-os/design-canvas-state";
import { composeDesignReport } from "../lib/contractor-os/design-report-composer";

test("NCI-065 composes BOM and cable schedule from the same design source", () => {
  const document = createCanvasDocument([
    { id: "cam-1", kind: "DEVICE", discipline: "CCTV", category: "CAMERA", geometry: { x: 10, y: 10, rotation: 0 } },
    { id: "cam-2", kind: "DEVICE", discipline: "CCTV", category: "CAMERA", geometry: { x: 20, y: 20, rotation: 0 } },
    {
      id: "cable-1",
      kind: "CABLE_PATH",
      geometry: { points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] },
      cableRoute: { cableType: "CAT6", serviceLoopFeet: 0, verticalRiseFeet: 0, slackPercent: 0 },
    },
  ]);

  const report = composeDesignReport({ floors: [{ id: "f1", name: "Level 1", document }] });
  assert.equal(report.bom.find((item) => item.key === "CCTV:CAMERA")?.quantity, 2);
  assert.equal(report.cableSchedule.length, 1);
  assert.equal(report.pricingSummary, undefined);
});

test("NCI-065 keeps pricing out of client-safe composition", () => {
  const document = createCanvasDocument([
    { id: "cam-1", kind: "DEVICE", discipline: "CCTV", category: "CAMERA", geometry: { x: 10, y: 10, rotation: 0 } },
  ]);
  const pricing = { materialUnitCostByKey: { "CCTV:CAMERA": 250 } };

  const clientReport = composeDesignReport({
    floors: [{ id: "f1", name: "Level 1", document }],
    profile: { clientSafe: true, includePricing: true, sections: ["BOM", "PRICING_SUMMARY"] },
    pricing,
  });
  assert.equal(clientReport.pricingSummary, undefined);

  const internalReport = composeDesignReport({
    floors: [{ id: "f1", name: "Level 1", document }],
    profile: { clientSafe: false, includePricing: true, sections: ["BOM", "PRICING_SUMMARY"] },
    pricing,
  });
  assert.equal(internalReport.pricingSummary?.subtotal, 250);
  assert.equal(internalReport.pricingSummary?.total, 250);
});
