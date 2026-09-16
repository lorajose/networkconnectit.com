import assert from "node:assert/strict";
import test from "node:test";

import { createCanvasDocument } from "../../lib/contractor-os/design-canvas-state";
import { canBeginLayerSafeEdit, hasLayerAwareCanvasChanges, moveLayerSafePolylineVertex } from "../../lib/contractor-os/design-canvas-layer-actions";
import { createPathwayElement, designCanvasLayers } from "../../lib/contractor-os/design-canvas-layer-integration";
import { setLayerLocked, setLayerVisibility } from "../../lib/contractor-os/design-layers";

function routeDocument() {
  const base = createCanvasDocument();
  const route = createPathwayElement(base, {
    id: "route-1",
    kind: "CABLE_PATH",
    geometry: { schemaVersion: 1, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] },
  });
  return { ...base, elements: [route], selectedIds: [route.id] };
}

test("vertex editing works for a visible unlocked pathway", () => {
  const document = routeDocument();
  assert.equal(canBeginLayerSafeEdit(document, "route-1"), true);
  const moved = moveLayerSafePolylineVertex(document, "route-1", 1, { x: 120, y: 40 });
  assert.deepEqual(moved.elements[0].geometry.points[1], { x: 120, y: 40 });
});

test("locked pathway refuses direct vertex mutation", () => {
  const base = routeDocument();
  const document = { ...base, layers: setLayerLocked(base.layers, "pathways", true) };
  assert.equal(canBeginLayerSafeEdit(document, "route-1"), false);
  assert.equal(moveLayerSafePolylineVertex(document, "route-1", 1, { x: 120, y: 40 }), document);
});

test("hidden pathway refuses direct vertex mutation", () => {
  const base = routeDocument();
  const document = { ...base, layers: setLayerVisibility(base.layers, "pathways", false) };
  assert.equal(canBeginLayerSafeEdit(document, "route-1"), false);
  assert.equal(moveLayerSafePolylineVertex(document, "route-1", 1, { x: 120, y: 40 }), document);
});

test("layer-aware dirty check detects layer-only changes", () => {
  const base = routeDocument();
  const saved = designCanvasLayers.signature(base);
  assert.equal(hasLayerAwareCanvasChanges(base, saved), false);
  const changed = { ...base, layers: setLayerVisibility(base.layers, "cctv", false) };
  assert.equal(hasLayerAwareCanvasChanges(changed, saved), true);
});
