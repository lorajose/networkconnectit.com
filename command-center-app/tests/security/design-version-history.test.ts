import assert from "node:assert/strict";
import test from "node:test";

import { canonicalizeDesignSnapshot, hashDesignSnapshot, type DesignProjectSnapshot } from "../../lib/contractor-os/design-version-snapshot";

const base: DesignProjectSnapshot = {
  schemaVersion: 1,
  projectId: "project-1",
  sourceRevision: 7,
  floors: [
    { id: "floor-b", name: "B", levelOrder: 2, canvasWidth: "1000", canvasHeight: "1000", scaleUnit: "FT", realUnitsPerDesignUnit: null },
    { id: "floor-a", name: "A", levelOrder: 1, canvasWidth: "1000", canvasHeight: "1000", scaleUnit: "FT", realUnitsPerDesignUnit: "0.5" },
  ],
  elements: [
    { id: "z", floorId: "floor-b", layerId: "layer-b", kind: "DEVICE", geometry: { schemaVersion: 1, points: [{ x: 5, y: 6 }] }, metadata: { hidden: false, locked: true }, schemaVersion: 1 },
    { id: "a", floorId: "floor-a", layerId: "layer-a", kind: "DEVICE", geometry: { schemaVersion: 1, points: [{ x: 1, y: 2 }] }, metadata: { locked: false, hidden: false }, schemaVersion: 1 },
  ],
};

test("design snapshot canonicalization is stable across floor, element and metadata ordering", () => {
  const reordered: DesignProjectSnapshot = {
    ...base,
    floors: [...base.floors].reverse(),
    elements: [...base.elements].reverse().map((element) => ({
      ...element,
      metadata: element.metadata ? Object.fromEntries(Object.entries(element.metadata).reverse()) : null,
    })),
  };
  assert.equal(canonicalizeDesignSnapshot(base), canonicalizeDesignSnapshot(reordered));
  assert.equal(hashDesignSnapshot(base), hashDesignSnapshot(reordered));
});

test("design snapshot hash changes when authoritative geometry changes", () => {
  const changed: DesignProjectSnapshot = {
    ...base,
    elements: base.elements.map((element) => element.id === "a" ? { ...element, geometry: { ...element.geometry, points: [{ x: 10, y: 2 }] } } : element),
  };
  assert.notEqual(hashDesignSnapshot(base), hashDesignSnapshot(changed));
});
