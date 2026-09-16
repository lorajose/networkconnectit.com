import assert from "node:assert/strict";
import test from "node:test";

import { createCanvasDocument } from "../../lib/contractor-os/design-canvas-state";
import { createCctvCameraElement, createPathwayElement } from "../../lib/contractor-os/design-canvas-layer-integration";
import {
  updateLayerSafeCableRoute,
  updateLayerSafeCameraFov,
  updateLayerSafeNetworkAddressing,
  updateLayerSafeTopologyConnection,
} from "../../lib/contractor-os/design-canvas-layer-editing";
import { setLayerLocked } from "../../lib/contractor-os/design-layers";
import { DEFAULT_CABLE_ROUTE_SETTINGS } from "../../lib/contractor-os/cable-route";

const geometry = { schemaVersion: 1 as const, points: [{ x: 10, y: 20 }] };

function cameraDocument() {
  const base = createCanvasDocument();
  const camera = createCctvCameraElement(base, { id: "camera-1", kind: "DEVICE", geometry });
  return { ...base, elements: [camera] };
}

test("camera property editors mutate an unlocked CCTV layer", () => {
  const document = cameraDocument();
  const fov = {
    source: "OPTICAL" as const,
    sensorWidthMm: 4.8,
    sensorHeightMm: 3.6,
    focalLengthMm: 6,
    lensMinMm: 2.8,
    lensMaxMm: 12,
    mountingHeightMeters: 3,
    targetPlaneHeightMeters: 0,
    tiltDownDegrees: 45,
    maxRangeMeters: 25,
  };
  const changed = updateLayerSafeCameraFov(document, "camera-1", fov);
  assert.deepEqual(changed.elements[0].cameraFov, fov);
});

test("locked CCTV layer rejects FOV and addressing editor changes", () => {
  const base = cameraDocument();
  const document = { ...base, layers: setLayerLocked(base.layers, "cctv", true) };
  const fov = {
    source: "OPTICAL" as const,
    sensorWidthMm: 4.8,
    sensorHeightMm: 3.6,
    focalLengthMm: 8,
    lensMinMm: 2.8,
    lensMaxMm: 12,
    mountingHeightMeters: 3,
    targetPlaneHeightMeters: 0,
    tiltDownDegrees: 45,
    maxRangeMeters: 30,
  };
  assert.equal(updateLayerSafeCameraFov(document, "camera-1", fov), document);
  assert.equal(updateLayerSafeNetworkAddressing(document, "camera-1", { ipAddress: "10.10.10.20" }), document);
});

test("locked pathways reject cable route and topology changes", () => {
  const base = createCanvasDocument();
  const route = createPathwayElement(base, {
    id: "route-1",
    kind: "CABLE_PATH",
    geometry: { schemaVersion: 1, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] },
  });
  const document = { ...base, elements: [route], layers: setLayerLocked(base.layers, "pathways", true) };
  assert.equal(updateLayerSafeCableRoute(document, route.id, DEFAULT_CABLE_ROUTE_SETTINGS), document);
  assert.equal(updateLayerSafeTopologyConnection(document, route.id, { sourceDeviceId: "a", targetDeviceId: "b" }), document);
});
