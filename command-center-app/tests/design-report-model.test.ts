import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_CABLE_ROUTE_SETTINGS } from "../lib/contractor-os/cable-route";
import { createCanvasDocument } from "../lib/contractor-os/design-canvas-state";
import { buildDesignReportModel } from "../lib/contractor-os/design-report-model";
import { DEFAULT_CLIENT_DESIGN_REPORT_PROFILE, DEFAULT_INTERNAL_DESIGN_REPORT_PROFILE } from "../lib/contractor-os/design-report-profile";

const geometry = (points: Array<{ x: number; y: number }>) => ({ schemaVersion: 1 as const, points });

const document = createCanvasDocument([
  { id: "camera-1", kind: "DEVICE", discipline: "CCTV", category: "CAMERA", layerId: "cctv", geometry: geometry([{ x: 10, y: 10 }]) },
  { id: "door-1", kind: "DEVICE", discipline: "ACCESS_CONTROL", category: "READER", layerId: "access-control", geometry: geometry([{ x: 20, y: 20 }]) },
  { id: "cat6-1", kind: "CABLE_PATH", discipline: "PATHWAY", category: "CABLE_ROUTE", layerId: "pathways", geometry: geometry([{ x: 0, y: 0 }, { x: 100, y: 0 }]), cableRoute: DEFAULT_CABLE_ROUTE_SETTINGS },
]);

test("report composition aggregates floor, BOM and cable schedule evidence", () => {
  const model = buildDesignReportModel([{ id: "floor-1", name: "First Floor", document }], DEFAULT_CLIENT_DESIGN_REPORT_PROFILE, 0.01);
  assert.equal(model.floors[0].deviceCount, 2);
  assert.equal(model.floors[0].cablePathCount, 1);
  assert.ok(model.bom.some((item) => item.key === "CCTV:CAMERA"));
  assert.ok(model.cableSchedule.some((item) => item.key.startsWith("CABLE:")));
  assert.equal(model.pricingVisible, false);
});

test("visible report layers constrain evidence without mutating the source document", () => {
  const profile = { ...DEFAULT_CLIENT_DESIGN_REPORT_PROFILE, visibleLayerIds: ["cctv"] };
  const model = buildDesignReportModel([{ id: "floor-1", name: "First Floor", document }], profile, 0.01);
  assert.equal(model.floors[0].deviceCount, 1);
  assert.equal(model.floors[0].cablePathCount, 0);
  assert.deepEqual(model.bom.map((item) => item.key), ["CCTV:CAMERA"]);
  assert.equal(document.elements.length, 3);
});

test("internal report can expose pricing section while client-safe report cannot", () => {
  const internal = buildDesignReportModel([{ id: "floor-1", name: "First Floor", document }], DEFAULT_INTERNAL_DESIGN_REPORT_PROFILE, 0.01);
  const client = buildDesignReportModel([{ id: "floor-1", name: "First Floor", document }], DEFAULT_CLIENT_DESIGN_REPORT_PROFILE, 0.01);
  assert.equal(internal.pricingVisible, true);
  assert.equal(client.pricingVisible, false);
});
