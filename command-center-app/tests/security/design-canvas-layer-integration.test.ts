import assert from "node:assert/strict";
import test from "node:test";

import { createCanvasDocument } from "../../lib/contractor-os/design-canvas-state";
import {
  createCctvCameraElement,
  createPathwayElement,
  designCanvasLayers,
} from "../../lib/contractor-os/design-canvas-layer-integration";
import { setLayerLocked, setLayerVisibility } from "../../lib/contractor-os/design-layers";

const geometry = { schemaVersion: 1 as const, points: [{ x: 1, y: 2 }] };

test("new cameras automatically enter the CCTV layer with durable metadata", () => {
  const document = createCanvasDocument();
  const camera = createCctvCameraElement(document, { id: "camera-1", kind: "DEVICE", geometry });
  assert.equal(camera.discipline, "CCTV");
  assert.equal(camera.category, "CAMERA");
  assert.equal(camera.layerId, "cctv");
});

test("new cable routes automatically enter the Pathways layer", () => {
  const document = createCanvasDocument();
  const route = createPathwayElement(document, { id: "route-1", kind: "CABLE_PATH", geometry });
  assert.equal(route.discipline, "PATHWAY");
  assert.equal(route.category, "CABLE_ROUTE");
  assert.equal(route.layerId, "pathways");
});

test("central Canvas integration hides elements, clears hidden selections and prevents locked geometry edits", () => {
  let document = createCanvasDocument();
  const camera = createCctvCameraElement(document, { id: "camera-1", kind: "DEVICE", geometry });
  document = { ...document, elements: [camera], selectedIds: [camera.id] };
  assert.deepEqual(designCanvasLayers.renderableElements(document).map((element) => element.id), ["camera-1"]);

  document = designCanvasLayers.applyLayerState(document, setLayerVisibility(document.layers, "cctv", false));
  assert.deepEqual(designCanvasLayers.renderableElements(document), []);
  assert.deepEqual(document.selectedIds, []);

  document = designCanvasLayers.applyLayerState(document, setLayerVisibility(document.layers, "cctv", true));
  document = designCanvasLayers.applyLayerState(document, setLayerLocked(document.layers, "cctv", true));
  assert.equal(designCanvasLayers.canEditGeometry(camera, document.layers), false);
});

test("layer-only changes alter the central Canvas autosave signature", () => {
  const document = createCanvasDocument();
  const changed = { ...document, layers: setLayerVisibility(document.layers, "access-control", false) };
  assert.notEqual(designCanvasLayers.signature(document), designCanvasLayers.signature(changed));
});

test("reassigning a canvas element keeps discipline/category metadata independent of display layer", () => {
  let document = createCanvasDocument();
  const camera = createCctvCameraElement(document, { id: "camera-1", kind: "DEVICE", geometry });
  document = { ...document, elements: [camera] };
  const reassigned = designCanvasLayers.assignElement(document, camera.id, "network");
  const result = reassigned.elements[0];
  assert.equal(result.layerId, "network");
  assert.equal(result.discipline, "CCTV");
  assert.equal(result.category, "CAMERA");
});
