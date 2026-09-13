import assert from "node:assert/strict";
import test from "node:test";

import {
  DESIGN_ESTIMATE_NOTICE,
  calculateIrCoverage,
  calculateProjectionCoverage,
  calculatePtzCoverage,
  clockwiseSweepDegrees,
  validateSpecializedCameraSettings,
} from "../../lib/contractor-os/camera-specialized";

test("IR illumination can be represented independently from optical FOV", () => {
  const ir = calculateIrCoverage({ enabled: true, rangeMeters: 30, beamAngleDegrees: 60 }, 90);
  assert.ok(ir);
  assert.equal(ir.kind, "SECTOR");
  assert.equal(ir.radiusMeters, 30);
  assert.equal(ir.startDegrees, 60);
  assert.equal(ir.endDegrees, 120);
  assert.equal(ir.estimated, true);
  assert.match(ir.estimateLabel, /Design estimate/);
  assert.equal(calculateIrCoverage({ enabled: false, rangeMeters: 30 }, 90), null);
});

test("PTZ pan ranges support wraparound and presets", () => {
  assert.equal(clockwiseSweepDegrees(300, 60), 120);
  const coverage = calculatePtzCoverage({
    panStartDegrees: 300,
    panEndDegrees: 60,
    presets: [
      { id: "home", label: "Home", panDegrees: 0, tiltDegrees: -20, zoom: 1, home: true },
      { id: "dock", label: "Loading dock", panDegrees: 45, tiltDegrees: -10, zoom: 2 },
    ],
  }, 40);
  assert.equal(coverage.kind, "SECTOR");
  assert.equal(coverage.radiusMeters, 40);
});

test("fisheye and panoramic cameras use specialized coverage representations", () => {
  const fisheye = calculateProjectionCoverage("FISHEYE_180", 90, 12);
  assert.equal(fisheye.kind, "SECTOR");
  assert.equal(clockwiseSweepDegrees(fisheye.startDegrees, fisheye.endDegrees), 180);

  const panoramic = calculateProjectionCoverage("PANORAMIC_360", 0, 18);
  assert.equal(panoramic.kind, "CIRCLE");
  assert.equal(panoramic.startDegrees, 0);
  assert.equal(panoramic.endDegrees, 360);
});

test("analog and IP camera metadata are accepted", () => {
  assert.equal(validateSpecializedCameraSettings({ signalType: "IP", projection: "RECTILINEAR" }).signalType, "IP");
  assert.equal(validateSpecializedCameraSettings({ signalType: "ANALOG", projection: "FISHEYE_180" }).signalType, "ANALOG");
});

test("PTZ metadata requires settings and validates presets", () => {
  assert.throws(() => validateSpecializedCameraSettings({ signalType: "IP", projection: "PTZ" }), /require PTZ settings/);
  assert.throws(() => validateSpecializedCameraSettings({
    signalType: "IP",
    projection: "PTZ",
    ptz: { panStartDegrees: 0, panEndDegrees: 180, presets: [{ id: "bad", label: "Bad", panDegrees: 10, tiltDegrees: -100 }] },
  }), /tilt/);
});

test("all simulated coverage is explicitly labeled as a design estimate", () => {
  assert.equal(DESIGN_ESTIMATE_NOTICE.estimated, true);
  assert.match(DESIGN_ESTIMATE_NOTICE.label, /verify manufacturer specifications and field conditions/i);
  for (const coverage of [
    calculateProjectionCoverage("RECTILINEAR", 0, 20, 90),
    calculateProjectionCoverage("FISHEYE_180", 0, 20),
    calculateProjectionCoverage("PANORAMIC_360", 0, 20),
    calculatePtzCoverage({ panStartDegrees: 0, panEndDegrees: 360, presets: [] }, 20),
  ]) {
    assert.equal(coverage.estimated, true);
    assert.equal(coverage.estimateLabel, DESIGN_ESTIMATE_NOTICE.label);
  }
});
