import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateDoriZones,
  describePixelDensity,
  distanceForPixelsPerMeter,
  pixelDensityAtDistance,
  sceneWidthMetersAtDistance,
} from "../../lib/contractor-os/camera-dori";

function close(actual: number, expected: number, tolerance = 0.01) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} was not within ${tolerance} of ${expected}`);
}

test("pixel density uses horizontal resolution over scene width", () => {
  const sceneWidth = sceneWidthMetersAtDistance(10, 90);
  close(sceneWidth, 20, 0.0001);
  close(pixelDensityAtDistance({ horizontalPixels: 2000, horizontalFovDegrees: 90 }, 10, "PPM"), 100, 0.0001);
});

test("PPF is derived consistently from PPM", () => {
  const density = describePixelDensity({ horizontalPixels: 3840, horizontalFovDegrees: 90 }, 10);
  close(density.ppm, 192, 0.0001);
  close(density.ppf, 58.5216, 0.001);
});

test("distance for target PPM inverts density calculation", () => {
  const input = { horizontalPixels: 3840, horizontalFovDegrees: 90 };
  const distance = distanceForPixelsPerMeter(input, 125);
  close(pixelDensityAtDistance(input, distance, "PPM"), 125, 0.0001);
});

test("DORI zones support configurable user thresholds and references", () => {
  const zones = calculateDoriZones(
    { horizontalPixels: 3840, horizontalFovDegrees: 90 },
    [
      { key: "CUSTOM_LOW", label: "Custom low detail", minimumPpm: 40, standardReference: "Customer design basis rev 2" },
      { key: "CUSTOM_HIGH", label: "Custom high detail", minimumPpm: 200, standardReference: "Customer design basis rev 2" },
    ],
  );
  assert.equal(zones.length, 2);
  assert.equal(zones[0].key, "CUSTOM_LOW");
  assert.equal(zones[0].standardReference, "Customer design basis rev 2");
  assert.ok(zones[0].distanceMeters > zones[1].distanceMeters);
});

test("invalid camera and threshold inputs fail closed", () => {
  assert.throws(() => sceneWidthMetersAtDistance(10, 180), /Horizontal FOV/);
  assert.throws(() => pixelDensityAtDistance({ horizontalPixels: 0, horizontalFovDegrees: 90 }, 10, "PPM"), /Horizontal pixels/);
  assert.throws(() => calculateDoriZones({ horizontalPixels: 1920, horizontalFovDegrees: 70 }, []), /At least one DORI threshold/);
  assert.throws(() => calculateDoriZones({ horizontalPixels: 1920, horizontalFovDegrees: 70 }, [{ key: "BAD", label: "Bad", minimumPpm: 0 }]), /threshold/);
});
