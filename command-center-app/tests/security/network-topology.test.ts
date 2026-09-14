import assert from "node:assert/strict";
import test from "node:test";

import { applyTopologyOverrides, autoLayoutTopology, generateTopology, topologyExportRows } from "../../lib/contractor-os/network-topology";
import type { CanvasElement } from "../../lib/contractor-os/design-canvas-state";

const point = (x: number, y: number) => ({ schemaVersion: 1 as const, points: [{ x, y }] });
const elements: CanvasElement[] = [
  { id: "switch-1", kind: "DEVICE", geometry: point(10, 20), networkAddressing: { ipAddress: "10.1.1.2", vlan: 10, segment: "Network" } },
  { id: "cam-1", kind: "DEVICE", geometry: point(40, 50), networkAddressing: { ipAddress: "10.1.20.10", vlan: 20, segment: "CCTV" } },
  { id: "route-1", kind: "CABLE_PATH", geometry: { schemaVersion: 1, points: [{ x: 10, y: 20 }, { x: 40, y: 50 }] }, topologyConnection: { sourceDeviceId: "switch-1", targetDeviceId: "cam-1" } },
];

test("generates topology nodes from devices and links from design connections", () => {
  const topology = generateTopology(elements);
  assert.deepEqual(topology.nodes.map((node) => node.id).sort(), ["cam-1", "switch-1"]);
  assert.deepEqual(topology.links, [{ id: "route-1", sourceId: "switch-1", targetId: "cam-1", sourceElementId: "route-1" }]);
});

test("auto-layout provides deterministic readable positions", () => {
  const topology = generateTopology(elements);
  const layout = autoLayoutTopology(topology.nodes, 2);
  assert.deepEqual(layout.map((node) => node.position), [{ x: 120, y: 100 }, { x: 340, y: 100 }]);
});

test("manual topology positions do not alter source connectivity", () => {
  const topology = generateTopology(elements);
  const moved = applyTopologyOverrides(topology, { "cam-1": { x: 900, y: 400 } });
  assert.deepEqual(moved.nodes.find((node) => node.id === "cam-1")?.position, { x: 900, y: 400 });
  assert.deepEqual(moved.links, topology.links);
  assert.deepEqual(elements.find((element) => element.id === "cam-1")?.geometry.points[0], { x: 40, y: 50 });
});

test("closeout export rows include addressing and connectivity", () => {
  const rows = topologyExportRows(generateTopology(elements));
  assert.deepEqual(rows.find((row) => row.nodeId === "cam-1"), { nodeId: "cam-1", label: "cam-1", ipAddress: "10.1.20.10", vlan: "20", segment: "CCTV", connectedTo: "switch-1" });
});
