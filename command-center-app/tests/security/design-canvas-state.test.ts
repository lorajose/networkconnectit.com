import assert from "node:assert/strict";
import test from "node:test";

import {
  commitCanvas,
  createCanvasDocument,
  createCanvasHistory,
  deleteSelected,
  deserializeCanvas,
  redoCanvas,
  rotateSelected,
  serializeCanvas,
  setCanvasSelection,
  translateSelected,
  undoCanvas,
  zoomCanvas,
} from "../../lib/contractor-os/design-canvas-state";

const device = (id: string, x: number, y: number, locked = false) => ({ id, locked, geometry: { schemaVersion: 1 as const, points: [{ x, y }], rotation: 0 } });

test("supports deterministic multi-select, drag, rotate, delete and undo redo", () => {
  let document = createCanvasDocument([device("camera-b", 20, 20), device("camera-a", 10, 10)]);
  document = setCanvasSelection(document, ["camera-a", "camera-b"]);
  const initial = createCanvasHistory(document);
  const moved = translateSelected(document, { x: 5, y: -2 });
  const rotated = rotateSelected(moved, 90);
  const committed = commitCanvas(initial, rotated);
  assert.deepEqual(committed.present.elements.find((item) => item.id === "camera-a")?.geometry.points[0], { x: 15, y: 8 });
  assert.equal(committed.present.elements.find((item) => item.id === "camera-b")?.geometry.rotation, 90);
  assert.deepEqual(undoCanvas(committed).present, document);
  assert.deepEqual(redoCanvas(undoCanvas(committed)).present, rotated);
  assert.equal(deleteSelected(rotated).elements.length, 0);
});

test("locked objects resist transform and deletion", () => {
  let document = createCanvasDocument([device("rack", 1, 2, true)]);
  document = setCanvasSelection(document, ["rack"]);
  assert.deepEqual(translateSelected(document, { x: 10, y: 10 }).elements[0].geometry.points[0], { x: 1, y: 2 });
  assert.equal(deleteSelected(document).elements.length, 1);
});

test("serialization is stable and zoom is bounded", () => {
  const a = createCanvasDocument([device("z", 0, 0), device("a", 1, 1)]);
  const b = createCanvasDocument([device("a", 1, 1), device("z", 0, 0)]);
  assert.equal(serializeCanvas(a), serializeCanvas(b));
  assert.equal(zoomCanvas(a, 100).viewport.zoom, 8);
  assert.equal(zoomCanvas(a, 0.001).viewport.zoom, 0.1);
});

test("camera DORI configuration survives serialization and revision restore", () => {
  const document = createCanvasDocument([{ ...device("camera-dori", 12, 18), kind: "DEVICE" as const, cameraDori: { horizontalPixels: 3840, inspectionDistanceMeters: 12.5, thresholds: [{ key: "CUSTOM", label: "Customer identify", minimumPpm: 220, standardReference: "Owner design criteria rev 3" }] } }]);
  const restored = deserializeCanvas(serializeCanvas(document));
  assert.deepEqual(restored.elements[0].cameraDori, document.elements[0].cameraDori);
});

test("specialized camera simulation survives serialization and revision restore", () => {
  const document = createCanvasDocument([{ ...device("camera-ptz", 20, 25), kind: "DEVICE" as const, cameraSimulation: { signalType: "IP" as const, projection: "PTZ" as const, ir: { enabled: true, rangeMeters: 45, beamAngleDegrees: 80 }, ptz: { panStartDegrees: 300, panEndDegrees: 60, presets: [{ id: "home", label: "Home", panDegrees: 0, tiltDegrees: -10, zoom: 1, home: true }, { id: "gate", label: "Gate", panDegrees: 45, tiltDegrees: -5, zoom: 3 }] } } }]);
  const restored = deserializeCanvas(serializeCanvas(document));
  assert.deepEqual(restored.elements[0].cameraSimulation, document.elements[0].cameraSimulation);
});

test("cable route waypoints and measurement settings survive serialization and revision restore", () => {
  const document = createCanvasDocument([{ id: "route-main-idf", kind: "CABLE_PATH" as const, geometry: { schemaVersion: 1 as const, points: [{ x: 40, y: 60 }, { x: 140, y: 60 }, { x: 140, y: 180 }] }, cableRoute: { cableType: "CAT6A" as const, factors: { verticalRiseMeters: 4.5, serviceLoopMeters: 1.5, wastePercent: 12 } } }]);
  const restored = deserializeCanvas(serializeCanvas(document));
  assert.deepEqual(restored.elements[0].geometry.points, document.elements[0].geometry.points);
  assert.deepEqual(restored.elements[0].cableRoute, document.elements[0].cableRoute);
});

test("network addressing survives serialization and revision restore", () => {
  const document = createCanvasDocument([{ ...device("camera-loading", 30, 40), kind: "DEVICE" as const, networkAddressing: { ipAddress: "10.40.20.31", vlan: 40, subnetCidr: "10.40.20.0/24", gateway: "10.40.20.1", switchPort: "IDF-2/Gi1/0/18", segment: "CCTV", poeWatts: 18 } }]);
  const restored = deserializeCanvas(serializeCanvas(document));
  assert.deepEqual(restored.elements[0].networkAddressing, document.elements[0].networkAddressing);
});
