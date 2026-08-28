import assert from "node:assert/strict";
import test from "node:test";

import {
  commitCanvas,
  createCanvasDocument,
  createCanvasHistory,
  deleteSelected,
  redoCanvas,
  rotateSelected,
  serializeCanvas,
  setCanvasSelection,
  translateSelected,
  undoCanvas,
  zoomCanvas,
} from "../../lib/contractor-os/design-canvas-state";

const device = (id: string, x: number, y: number, locked = false) => ({
  id,
  locked,
  geometry: { schemaVersion: 1 as const, points: [{ x, y }], rotation: 0 },
});

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
