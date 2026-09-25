import assert from "node:assert/strict";
import test from "node:test";

import { calculateCameraCoverage } from "../../lib/contractor-os/camera-fov";
import { calculateDoriZones } from "../../lib/contractor-os/camera-dori";
import { measureCalibratedDesignLengthMeters } from "../../lib/contractor-os/design-scale";
import { measureCableRoute, type CableRoute } from "../../lib/contractor-os/cable-route";

test("NCI-073 geometry release gate composes FOV, DORI, scale and cable length", () => {
  const coverage = calculateCameraCoverage(
    { x: 0, y: 0 },
    0,
    {
      source: "MANUAL",
      manualHorizontalFovDegrees: 90,
      manualVerticalFovDegrees: 45,
      mountingHeightMeters: 3,
      targetPlaneHeightMeters: 0,
      tiltDownDegrees: 45,
    },
    10,
  );
  assert.ok(coverage.farDistanceMeters > coverage.nearDistanceMeters);

  const zones = calculateDoriZones(
    { horizontalPixels: 3840, horizontalFovDegrees: 90 },
    [
      { key: "DETECT", label: "Detect", minimumPpm: 25 },
      { key: "IDENTIFY", label: "Identify", minimumPpm: 250 },
    ],
  );
  assert.equal(zones.length, 2);
  assert.ok(zones[0].distanceMeters > zones[1].distanceMeters);

  assert.equal(
    measureCalibratedDesignLengthMeters({ designDistance: 20, realUnitsPerDesignUnit: 0.5, unit: "M" }),
    10,
  );

  const route: CableRoute = {
    id: "qa-route",
    cableType: "CAT6",
    points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 8 }],
    factors: { verticalRiseMeters: 2, serviceLoopMeters: 1, wastePercent: 10 },
  };
  const measured = measureCableRoute(route, 0.5);
  assert.equal(measured.horizontalMeters, 7);
  assert.ok(Math.abs(measured.totalMeters - 11) < 1e-9);
});

test("NCI-073 large geometry benchmark stays within release budget", () => {
  const started = performance.now();
  let zones = 0;
  for (let index = 0; index < 2000; index += 1) {
    zones += calculateDoriZones(
      { horizontalPixels: index % 2 ? 1920 : 3840, horizontalFovDegrees: 60 + (index % 30) },
      [
        { key: "D", label: "Detect", minimumPpm: 25 },
        { key: "O", label: "Observe", minimumPpm: 62.5 },
        { key: "R", label: "Recognize", minimumPpm: 125 },
        { key: "I", label: "Identify", minimumPpm: 250 },
      ],
    ).length;
  }
  const elapsedMs = performance.now() - started;
  assert.equal(zones, 8000);
  assert.ok(elapsedMs < 1500, `2000-camera DORI benchmark took ${elapsedMs.toFixed(1)}ms`);
});
