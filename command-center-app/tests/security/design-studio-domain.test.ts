import assert from "node:assert/strict";
import test from "node:test";

import {
  assertFiniteDesignGeometry,
  calculateRealWorldLength,
  measuredPolylineLength,
} from "../../lib/contractor-os/design-studio";

test("calculates deterministic polyline lengths independent of rendering", () => {
  assert.equal(measuredPolylineLength([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 6, y: 8 }]), 10);
});

test("converts calibrated design length to installation length with slack", () => {
  const actual = calculateRealWorldLength({ designLength: 100, realUnitsPerDesignUnit: 0.5, slackPercent: 10 });
  assert.ok(Math.abs(actual - 55) < 1e-9);
});

test("rejects invalid geometry instead of persisting non-finite coordinates", () => {
  assert.throws(
    () => assertFiniteDesignGeometry({ schemaVersion: 1, points: [{ x: Number.NaN, y: 0 }] }),
    /finite/,
  );
});
