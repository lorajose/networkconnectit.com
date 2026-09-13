import assert from "node:assert/strict";
import test from "node:test";

import { designUnitsPerMeter, measureCalibratedDesignLengthMeters, metersPerDesignUnit } from "../../lib/contractor-os/design-scale";

test("converts calibrated feet-per-design-unit into design units per meter", () => {
  assert.equal(metersPerDesignUnit(0.5, "FT"), 0.1524);
  assert.ok(Math.abs(designUnitsPerMeter(0.5, "FT") - 6.561679790026247) < 1e-12);
});

test("converts metric calibration directly into design units per meter", () => {
  assert.equal(metersPerDesignUnit(0.2, "M"), 0.2);
  assert.equal(designUnitsPerMeter(0.2, "M"), 5);
  assert.equal(measureCalibratedDesignLengthMeters({ designDistance: 25, realUnitsPerDesignUnit: 0.2, unit: "M" }), 5);
});

test("supports inch, centimeter and millimeter calibration units", () => {
  assert.equal(metersPerDesignUnit(12, "IN"), 0.30479999999999996);
  assert.equal(metersPerDesignUnit(100, "CM"), 1);
  assert.equal(metersPerDesignUnit(1000, "MM"), 1);
});

test("rejects invalid calibration ratios", () => {
  assert.throws(() => designUnitsPerMeter(0, "FT"));
  assert.throws(() => designUnitsPerMeter(Number.NaN, "M"));
});
