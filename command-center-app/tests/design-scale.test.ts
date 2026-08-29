import assert from "node:assert/strict";
import test from "node:test";
import {
  calibrateDesignScale,
  measureCalibratedDesignLength,
  scaleChangeAffectsCalculatedLengths,
} from "../lib/contractor-os/design-scale";

test("calibrates a known reference dimension deterministically", () => {
  const scale = calibrateDesignScale({ designDistance: 250, realDistance: 50, unit: "FT" });
  assert.equal(scale.realUnitsPerDesignUnit, 0.2);
  assert.equal(measureCalibratedDesignLength({ designDistance: 125, calibration: scale }), 25);
});

test("measurement depends on design geometry and scale, not viewport zoom", () => {
  const scale = calibrateDesignScale({ designDistance: 100, realDistance: 10, unit: "M" });
  const measured = measureCalibratedDesignLength({ designDistance: 42, calibration: scale });
  assert.equal(measured, 4.2);
});

test("detects scale changes that require explicit confirmation", () => {
  const current = calibrateDesignScale({ designDistance: 100, realDistance: 10, unit: "FT" });
  const same = calibrateDesignScale({ designDistance: 200, realDistance: 20, unit: "FT" });
  const changed = calibrateDesignScale({ designDistance: 100, realDistance: 12, unit: "FT" });
  const unitChanged = calibrateDesignScale({ designDistance: 100, realDistance: 10, unit: "M" });
  assert.equal(scaleChangeAffectsCalculatedLengths(current, same), false);
  assert.equal(scaleChangeAffectsCalculatedLengths(current, changed), true);
  assert.equal(scaleChangeAffectsCalculatedLengths(current, unitChanged), true);
});

test("rejects invalid calibration dimensions", () => {
  assert.throws(() => calibrateDesignScale({ designDistance: 0, realDistance: 10, unit: "FT" }));
  assert.throws(() => calibrateDesignScale({ designDistance: 10, realDistance: -1, unit: "FT" }));
});
