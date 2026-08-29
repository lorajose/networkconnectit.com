import assert from "node:assert/strict";
import test from "node:test";
import { canvasElementKind, createCanvasDocument, serializeCanvas } from "../lib/contractor-os/design-canvas-state";

test("legacy canvas elements default to DEVICE", () => {
  const document = createCanvasDocument([
    { id: "legacy", geometry: { schemaVersion: 1, points: [{ x: 10, y: 20 }] } },
  ]);
  assert.equal(canvasElementKind(document.elements[0]), "DEVICE");
});

test("wall and obstacle kinds survive deterministic serialization", () => {
  const document = createCanvasDocument([
    { id: "wall-1", kind: "WALL", geometry: { schemaVersion: 1, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] } },
    { id: "obstacle-1", kind: "OBSTACLE", geometry: { schemaVersion: 1, points: [{ x: 20, y: 20 }, { x: 50, y: 50 }] } },
  ]);
  const serialized = serializeCanvas(document);
  assert.match(serialized, /"kind":"WALL"/);
  assert.match(serialized, /"kind":"OBSTACLE"/);
});
