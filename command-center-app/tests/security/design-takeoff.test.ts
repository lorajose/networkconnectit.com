import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_CABLE_ROUTE_SETTINGS } from "../../lib/contractor-os/cable-route";
import { createCanvasDocument } from "../../lib/contractor-os/design-canvas-state";
import {
  buildDesignTakeoffItems,
  createProposedDesignTakeoffSnapshot,
  diffProposedDesignTakeoff,
} from "../../lib/contractor-os/design-takeoff";

const deviceGeometry = (x: number, y: number) => ({
  schemaVersion: 1 as const,
  points: [{ x, y }],
  width: 20,
  height: 20,
  rotation: 0,
});

function fixture() {
  const document = createCanvasDocument();
  document.elements = [
    {
      id: "cam-1",
      kind: "DEVICE",
      discipline: "CCTV",
      category: "CAMERA",
      geometry: deviceGeometry(10, 10),
    },
    {
      id: "cam-2",
      kind: "DEVICE",
      discipline: "CCTV",
      category: "CAMERA",
      geometry: deviceGeometry(30, 10),
    },
    {
      id: "route-1",
      kind: "CABLE_PATH",
      discipline: "PATHWAY",
      category: "CABLE_ROUTE",
      geometry: { schemaVersion: 1, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], rotation: 0 },
      cableRoute: DEFAULT_CABLE_ROUTE_SETTINGS,
    },
  ];
  return document;
}

test("design takeoff groups devices and preserves source IDs", () => {
  const items = buildDesignTakeoffItems(fixture(), 0.01);
  const cameras = items.find((item) => item.key === "CCTV:CAMERA");
  assert.equal(cameras?.quantity, 2);
  assert.deepEqual(cameras?.sourceElementIds, ["cam-1", "cam-2"]);
  assert.ok(items.some((item) => item.key === "CABLE:CAT6" && item.unit === "FT"));
});

test("generated takeoff is proposed and requires human approval", () => {
  const proposal = createProposedDesignTakeoffSnapshot(fixture(), 0.01, "2026-09-15T12:00:00.000Z");
  assert.equal(proposal.status, "PROPOSED");
  assert.equal(proposal.requiresHumanApproval, true);
  assert.ok(proposal.items.length >= 2);
});

test("re-running handoff exposes additions removals and quantity changes", () => {
  const beforeDocument = fixture();
  const before = createProposedDesignTakeoffSnapshot(beforeDocument, 0.01, "2026-09-15T12:00:00.000Z");

  const afterDocument = fixture();
  afterDocument.elements = afterDocument.elements.filter((element) => element.id !== "route-1");
  afterDocument.elements.push({
    id: "reader-1",
    kind: "DEVICE",
    discipline: "ACCESS_CONTROL",
    category: "READER",
    geometry: deviceGeometry(50, 20),
  });
  afterDocument.elements.push({
    id: "cam-3",
    kind: "DEVICE",
    discipline: "CCTV",
    category: "CAMERA",
    geometry: deviceGeometry(60, 10),
  });

  const after = createProposedDesignTakeoffSnapshot(afterDocument, 0.01, "2026-09-15T12:05:00.000Z");
  const diff = diffProposedDesignTakeoff(before, after);
  assert.ok(diff.added.some((item) => item.key === "ACCESS_CONTROL:READER"));
  assert.ok(diff.removed.some((item) => item.key === "CABLE:CAT6"));
  assert.equal(diff.changed.find((item) => item.after.key === "CCTV:CAMERA")?.quantityDelta, 1);
});
