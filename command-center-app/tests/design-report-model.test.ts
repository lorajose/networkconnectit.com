import assert from "node:assert/strict";
import test from "node:test";

import { createCanvasDocument } from "../lib/contractor-os/design-canvas-state";
import { buildDesignReportModel } from "../lib/contractor-os/design-report-model";
import { resolveDesignReportProfile } from "../lib/contractor-os/design-report-profile";

test("design report model composes device BOM and cable schedule", () => {
  const document = createCanvasDocument([
    {
      id: "camera-1",
      kind: "DEVICE",
      discipline: "CCTV",
      category: "CAMERA",
      geometry: { x: 10, y: 10, width: 20, height: 20, rotation: 0 },
    },
    {
      id: "camera-2",
      kind: "DEVICE",
      discipline: "CCTV",
      category: "CAMERA",
      geometry: { x: 40, y: 10, width: 20, height: 20, rotation: 0 },
    },
    {
      id: "cable-1",
      kind: "CABLE_PATH",
      discipline: "PATHWAY",
      category: "CABLE_ROUTE",
      geometry: { points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] },
      cableRoute: { cableType: "CAT6", serviceLoopFeet: 0, verticalRiseFeet: 0, wastePercent: 0 },
    },
  ]);

  const model = buildDesignReportModel(
    [{ id: "floor-1", name: "Level 1", document }],
    resolveDesignReportProfile(),
    0.3048,
  );

  assert.equal(model.floors[0]?.deviceCount, 2);
  assert.equal(model.floors[0]?.cablePathCount, 1);
  assert.equal(model.bom.find((item) => item.key === "CCTV:CAMERA")?.quantity, 2);
  assert.equal(model.cableSchedule.length, 1);
  assert.equal(model.pricingVisible, false);
});

test("report layer profile removes hidden disciplines from derived quantities", () => {
  const document = createCanvasDocument([
    {
      id: "camera-1",
      kind: "DEVICE",
      layerId: "cctv",
      discipline: "CCTV",
      category: "CAMERA",
      geometry: { x: 0, y: 0, width: 10, height: 10, rotation: 0 },
    },
    {
      id: "reader-1",
      kind: "DEVICE",
      layerId: "access",
      discipline: "ACCESS_CONTROL",
      category: "READER",
      geometry: { x: 20, y: 0, width: 10, height: 10, rotation: 0 },
    },
  ]);

  const profile = resolveDesignReportProfile({ visibleLayerIds: ["cctv"] });
  const model = buildDesignReportModel([{ id: "floor-1", name: "Level 1", document }], profile);

  assert.equal(model.floors[0]?.elementCount, 1);
  assert.equal(model.bom.some((item) => item.key === "ACCESS_CONTROL:READER"), false);
});

test("client-safe composition cannot expose pricing", () => {
  const profile = resolveDesignReportProfile({
    clientSafe: true,
    includePricing: true,
    sections: ["BOM", "PRICING_SUMMARY"],
  });
  const model = buildDesignReportModel([{ id: "floor-1", name: "Level 1", document: createCanvasDocument() }], profile);
  assert.equal(model.pricingVisible, false);
  assert.equal(model.sections.includes("PRICING_SUMMARY"), false);
});
