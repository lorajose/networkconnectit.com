import assert from "node:assert/strict";
import test from "node:test";

import {
  createCustomLayer,
  createDefaultDesignLayerState,
  createExportProfile,
  elementsForExport,
  isElementLayerLocked,
  renameLayer,
  reorderLayer,
  setLayerLocked,
  setLayerVisibility,
  visibleElements,
} from "../../lib/contractor-os/design-layers";
import { createCanvasDocument, deserializeCanvas, serializeCanvas, setCanvasSelection, translateSelected } from "../../lib/contractor-os/design-canvas-state";

test("default multidisciplinary layers include required low-voltage disciplines", () => {
  const state = createDefaultDesignLayerState();
  assert.deepEqual(state.layers.map((layer) => layer.id), ["cctv", "access-control", "intrusion", "network", "pathways"]);
  assert.ok(state.layers.every((layer) => layer.visible && !layer.locked && layer.builtIn));
});

test("custom layers can be created, renamed and reordered", () => {
  let state = createDefaultDesignLayerState();
  state = createCustomLayer(state, { id: "av", name: "AV" });
  state = renameLayer(state, "av", "Audio Visual");
  state = reorderLayer(state, "av", 1);
  assert.equal(state.layers[1].id, "av");
  assert.equal(state.layers[1].name, "Audio Visual");
  assert.deepEqual(state.layers.map((layer) => layer.order), [0, 1, 2, 3, 4, 5]);
});

test("visibility, lock state and element discipline metadata persist with the canvas", () => {
  let document = createCanvasDocument([
    { id: "cam-1", kind: "DEVICE", discipline: "CCTV", category: "CAMERA", layerId: "cctv", geometry: { schemaVersion: 1, points: [{ x: 10, y: 20 }] } },
  ]);
  document = { ...document, layers: setLayerVisibility(setLayerLocked(document.layers, "cctv", true), "network", false) };
  const restored = deserializeCanvas(serializeCanvas(document));
  assert.equal(restored.layers.layers.find((layer) => layer.id === "cctv")?.locked, true);
  assert.equal(restored.layers.layers.find((layer) => layer.id === "network")?.visible, false);
  assert.equal(restored.elements[0].discipline, "CCTV");
  assert.equal(restored.elements[0].category, "CAMERA");
  assert.equal(restored.elements[0].layerId, "cctv");
});

test("hidden layers are excluded from display and selection while locked layers block geometry mutation", () => {
  let document = createCanvasDocument([
    { id: "cam-1", kind: "DEVICE", discipline: "CCTV", layerId: "cctv", geometry: { schemaVersion: 1, points: [{ x: 10, y: 20 }] } },
    { id: "sw-1", kind: "DEVICE", discipline: "NETWORK", layerId: "network", geometry: { schemaVersion: 1, points: [{ x: 50, y: 60 }] } },
  ]);
  document = { ...document, layers: setLayerVisibility(setLayerLocked(document.layers, "cctv", true), "network", false) };
  assert.deepEqual(visibleElements(document.elements, document.layers).map((element) => element.id), ["cam-1"]);
  assert.equal(isElementLayerLocked(document.elements[0], document.layers), true);
  document = setCanvasSelection(document, ["cam-1", "sw-1"]);
  assert.deepEqual(document.selectedIds, ["cam-1"]);
  const moved = translateSelected(document, { x: 100, y: 100 });
  assert.deepEqual(moved.elements.find((element) => element.id === "cam-1")?.geometry.points[0], { x: 10, y: 20 });
});

test("export profiles include only selected layers without changing device metadata", () => {
  const state = createDefaultDesignLayerState();
  const profile = createExportProfile(state, { id: "cctv-closeout", name: "CCTV Closeout", includedLayerIds: ["cctv", "pathways", "missing"] });
  const elements = [
    { id: "cam-1", kind: "DEVICE" as const, discipline: "CCTV" as const, category: "CAMERA", layerId: "cctv", geometry: { schemaVersion: 1 as const, points: [{ x: 1, y: 1 }] } },
    { id: "reader-1", kind: "DEVICE" as const, discipline: "ACCESS_CONTROL" as const, category: "READER", layerId: "access-control", geometry: { schemaVersion: 1 as const, points: [{ x: 2, y: 2 }] } },
    { id: "path-1", kind: "CABLE_PATH" as const, discipline: "PATHWAY" as const, layerId: "pathways", geometry: { schemaVersion: 1 as const, points: [{ x: 0, y: 0 }, { x: 3, y: 3 }] } },
  ];
  assert.deepEqual(profile.includedLayerIds, ["cctv", "pathways"]);
  const exported = elementsForExport(elements, profile);
  assert.deepEqual(exported.map((element) => element.id), ["cam-1", "path-1"]);
  assert.equal(exported[0].discipline, "CCTV");
  assert.equal(exported[0].category, "CAMERA");
});

test("legacy canvas documents without layers receive default layers on deserialize", () => {
  const legacy = JSON.stringify({ schemaVersion: 1, viewport: { x: 0, y: 0, zoom: 1 }, elements: [], selectedIds: [] });
  const restored = deserializeCanvas(legacy);
  assert.equal(restored.layers.layers.length, 5);
});
