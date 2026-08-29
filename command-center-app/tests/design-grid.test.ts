import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_DESIGN_GRID, nearestAlignmentGuide, snapDesignPoint } from "../lib/contractor-os/design-grid";

test("snap is deterministic and independent of viewport zoom", () => {
  const settings = { ...DEFAULT_DESIGN_GRID, snapEnabled: true, spacing: 20 };
  assert.deepEqual(snapDesignPoint({ x: 33, y: 47 }, settings), { x: 40, y: 40 });
  assert.deepEqual(snapDesignPoint({ x: 33, y: 47 }, settings), { x: 40, y: 40 });
});

test("snap respects a custom grid origin", () => {
  const settings = { ...DEFAULT_DESIGN_GRID, snapEnabled: true, spacing: 10, origin: { x: 5, y: 5 } };
  assert.deepEqual(snapDesignPoint({ x: 11, y: 19 }, settings), { x: 15, y: 15 });
});

test("disabled snap preserves the design point", () => {
  const point = { x: 12.5, y: 22.75 };
  assert.deepEqual(snapDesignPoint(point, { ...DEFAULT_DESIGN_GRID, snapEnabled: false }), point);
});

test("alignment guide chooses nearest candidate on each axis inside threshold", () => {
  const guide = nearestAlignmentGuide({
    moving: { x: 101, y: 198 },
    candidates: [{ x: 100, y: 250 }, { x: 160, y: 200 }],
    threshold: 4,
  });
  assert.deepEqual(guide, { x: 100, y: 200 });
});

test("rejects invalid grid spacing", () => {
  assert.throws(() => snapDesignPoint({ x: 1, y: 1 }, { ...DEFAULT_DESIGN_GRID, spacing: 0 }));
});
