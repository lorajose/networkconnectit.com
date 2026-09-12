import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCameraCoverage,
  opticalFovDegrees,
  resolveCameraFov,
  varifocalFovRange,
} from "../../lib/contractor-os/camera-fov";

function close(actual: number, expected: number, tolerance = 0.01) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} was not within ${tolerance} of ${expected}`);
}

test("optical FOV matches known pinhole-camera geometry", () => {
  close(opticalFovDegrees(4.8, 4), 61.9275, 0.001);
  close(opticalFovDegrees(3.6, 4), 48.4555, 0.001);
});

test("varifocal range is widest at minimum focal length", () => {
  const range = varifocalFovRange(4.8, 2.8, 12);
  assert.ok(range.widestDegrees > range.narrowestDegrees);
  close(range.widestDegrees, opticalFovDegrees(4.8, 2.8));
  close(range.narrowestDegrees, opticalFovDegrees(4.8, 12));
});

test("optical varifocal parameters resolve current focal length without mutating lens limits", () => {
  const resolved = resolveCameraFov({
    source: "OPTICAL",
    sensorWidthMm: 4.8,
    sensorHeightMm: 3.6,
    focalLengthMm: 6,
    lensMinMm: 2.8,
    lensMaxMm: 12,
    mountingHeightMeters: 3,
    targetPlaneHeightMeters: 0,
    tiltDownDegrees: 45,
  });
  assert.equal(resolved.source, "OPTICAL");
  assert.equal(resolved.label, "Optical varifocal FOV");
  close(resolved.horizontalDegrees, opticalFovDegrees(4.8, 6));
});

test("coverage models rotation, mounting height, tilt and target plane", () => {
  const coverage = calculateCameraCoverage(
    { x: 100, y: 100 },
    90,
    {
      source: "OPTICAL",
      sensorWidthMm: 4.8,
      sensorHeightMm: 3.6,
      focalLengthMm: 4,
      mountingHeightMeters: 3,
      targetPlaneHeightMeters: 0,
      tiltDownDegrees: 45,
      maxRangeMeters: 20,
    },
    10,
  );

  close(coverage.centerDistanceMeters, 3, 0.001);
  assert.ok(coverage.nearDistanceMeters < coverage.centerDistanceMeters);
  assert.ok(coverage.farDistanceMeters > coverage.centerDistanceMeters);
  assert.equal(coverage.polygon.length, 6);
  assert.ok(coverage.polygon[1].y > 100, "90-degree camera rotation should project coverage downward in design coordinates");
});

test("manual FOV is an explicit labeled fallback for unsupported optics", () => {
  const resolved = resolveCameraFov({
    source: "MANUAL",
    manualHorizontalFovDegrees: 80,
    manualVerticalFovDegrees: 50,
    mountingHeightMeters: 3,
    targetPlaneHeightMeters: 0,
    tiltDownDegrees: 40,
  });
  assert.deepEqual(resolved, {
    horizontalDegrees: 80,
    verticalDegrees: 50,
    source: "MANUAL",
    label: "Manual FOV fallback",
  });
});

test("invalid optical and mounting parameters fail closed", () => {
  assert.throws(() => opticalFovDegrees(0, 4), /Sensor dimension/);
  assert.throws(() => resolveCameraFov({
    source: "OPTICAL",
    sensorWidthMm: 4.8,
    sensorHeightMm: 3.6,
    focalLengthMm: 13,
    lensMinMm: 2.8,
    lensMaxMm: 12,
    mountingHeightMeters: 3,
    targetPlaneHeightMeters: 0,
    tiltDownDegrees: 45,
  }), /above the varifocal lens maximum/);
  assert.throws(() => calculateCameraCoverage(
    { x: 0, y: 0 },
    0,
    {
      source: "MANUAL",
      manualHorizontalFovDegrees: 80,
      manualVerticalFovDegrees: 50,
      mountingHeightMeters: 2,
      targetPlaneHeightMeters: 2,
      tiltDownDegrees: 45,
    },
  ), /Mounting height must be above/);
});
