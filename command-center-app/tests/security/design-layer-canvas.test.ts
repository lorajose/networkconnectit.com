import assert from "node:assert/strict";
import test from "node:test";

import {
  applyDesignLayerState,
  assignCanvasElementLayer,
  canEditCanvasElementGeometry,
  persistedDesignSignature,
  renderableDesignElements,
} from "../../lib/contractor-os/design-layer-canvas";
import { createCanvasDocument } from "../../lib/contractor-os/design-canvas-state";
import { setLayerLocked, setLayerVisibility } from "../../lib/contractor-os/design-layers";

function fixture() {
  return createCanvasDocument([
    { id: "cam-1", kind: "DEVICE", discipline: "CCTV", category: "CAMERA", layerId: "cctv", geometry: { schemaVersion: 1, points: [{ x: 10, y: 20 }] } },
    { id: "sw-1", kind: "DEVICE", discipline: "NETWORK", category: "SWITCH", layerId: "network", geometry: { schemaVersion: 1, points: [{ x: 50, y: 60 }] } },
  ]);
}

test("layer-only changes participate in the Design Studio persistence signature", () => {
  const document = fixture();
  const before = persistedDesignSignature(document);
  const next = { ...document, layers: setLayerVisibility(document.layers, "network", false) };
  assert.notEqual(persistedDesignSignature(next), before);
});

test("renderable elements respect both layer visibility and element hidden state", () => {
  let document = fixture();
  document = { ...document, elements: document.elements.map((element) => element.id === "cam-1" ? { ...element, hidden: true } : element) };
  document = { ...document, layers: setLayerVisibility(document.layers, "network", false) };
  assert.deepEqual(renderableDesignElements(document), []);
});

test("hiding a layer clears selected elements that can no longer be interacted with", () => {
  let document = { ...fixture(), selectedIds: ["cam-1", "sw-1"] };
  document = applyDesignLayerState(document, setLayerVisibility(document.layers, "network", false));
  assert.deepEqual(document.selectedIds, ["cam-1"]);
});

test("layer assignment preserves discipline and category metadata", () => {
  const document = fixture();
  const next = assignCanvasElementLayer(document, "cam-1", "network");
  const camera = next.elements.find((element) => element.id === "cam-1");
  assert.equal(camera?.layerId, "network");
  assert.equal(camera?.discipline, "CCTV");
  assert.equal(camera?.category, "CAMERA");
});

test("locked layers block direct geometry editors", () => {
  const document = fixture();
  const camera = document.elements[0];
  assert.equal(canEditCanvasElementGeometry(camera, document.layers), true);
  const locked = setLayerLocked(document.layers, "cctv", true);
  assert.equal(canEditCanvasElementGeometry(camera, locked), false);
});
