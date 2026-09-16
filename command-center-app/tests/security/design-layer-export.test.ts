import assert from "node:assert/strict";
import test from "node:test";

import { createCanvasDocument } from "../../lib/contractor-os/design-canvas-state";
import { createVisibleLayerExportProfile, designElementsForLayerExport } from "../../lib/contractor-os/design-layer-export";
import { setLayerVisibility } from "../../lib/contractor-os/design-layers";

function fixture() {
  return createCanvasDocument([
    { id: "camera", kind: "DEVICE", discipline: "CCTV", category: "CAMERA", layerId: "cctv", geometry: { schemaVersion: 1, points: [{ x: 10, y: 10 }] } },
    { id: "door", kind: "DEVICE", discipline: "ACCESS_CONTROL", category: "READER", layerId: "access-control", geometry: { schemaVersion: 1, points: [{ x: 20, y: 20 }] } },
    { id: "legacy-note", kind: "TEXT", discipline: "ANNOTATION", category: "NOTE", geometry: { schemaVersion: 1, points: [{ x: 30, y: 30 }] } },
    { id: "hidden-camera", kind: "DEVICE", discipline: "CCTV", category: "CAMERA", layerId: "cctv", hidden: true, geometry: { schemaVersion: 1, points: [{ x: 40, y: 40 }] } },
  ]);
}

test("visible-layer export profile follows current discipline visibility", () => {
  let document = fixture();
  document = { ...document, layers: setLayerVisibility(document.layers, "access-control", false) };
  const profile = createVisibleLayerExportProfile(document);
  assert.equal(profile.includedLayerIds.includes("cctv"), true);
  assert.equal(profile.includedLayerIds.includes("access-control"), false);
});

test("export profile excludes omitted layers while retaining unassigned legacy content", () => {
  const document = fixture();
  const profile = { id: "cctv-only", name: "CCTV only", includedLayerIds: ["cctv"] };
  assert.deepEqual(designElementsForLayerExport(document, profile).map((element) => element.id), ["camera", "legacy-note"]);
});
