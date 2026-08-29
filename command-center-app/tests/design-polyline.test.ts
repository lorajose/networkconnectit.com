import assert from "node:assert/strict";
import test from "node:test";
import {
  appendPolylinePoint,
  createPolyline,
  movePolylineVertex,
  removePolylineVertex,
  translatePolyline,
} from "../lib/contractor-os/design-polyline";

test("creates wall and obstacle polylines with at least two points", () => {
  const wall = createPolyline({ id: "wall-1", kind: "WALL", points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] });
  assert.equal(wall.kind, "WALL");
  assert.equal(wall.geometry.points.length, 2);
  assert.throws(() => createPolyline({ id: "bad", kind: "OBSTACLE", points: [{ x: 0, y: 0 }] }));
});

test("appends and edits vertices deterministically", () => {
  const obstacle = createPolyline({ id: "obs-1", kind: "OBSTACLE", points: [{ x: 10, y: 10 }, { x: 30, y: 10 }] });
  const extended = appendPolylinePoint(obstacle, { x: 30, y: 40 });
  const moved = movePolylineVertex(extended, 1, { x: 35, y: 15 });
  assert.deepEqual(moved.geometry.points, [{ x: 10, y: 10 }, { x: 35, y: 15 }, { x: 30, y: 40 }]);
});

test("removes vertices but preserves the two-point minimum", () => {
  const wall = createPolyline({ id: "wall-2", kind: "WALL", points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }] });
  const shortened = removePolylineVertex(wall, 1);
  assert.deepEqual(shortened.geometry.points, [{ x: 0, y: 0 }, { x: 20, y: 0 }]);
  assert.throws(() => removePolylineVertex(shortened, 0));
});

test("translates the entire polyline without mutating the source", () => {
  const wall = createPolyline({ id: "wall-3", kind: "WALL", points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] });
  const moved = translatePolyline(wall, { x: 5, y: -2 });
  assert.deepEqual(moved.geometry.points, [{ x: 6, y: 0 }, { x: 8, y: 2 }]);
  assert.deepEqual(wall.geometry.points, [{ x: 1, y: 2 }, { x: 3, y: 4 }]);
});
