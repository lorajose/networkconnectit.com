import assert from "node:assert/strict";
import test from "node:test";
import { topologyCloseoutManifest, topologyToSvg } from "../../lib/contractor-os/network-topology-export";
import type { TopologyDocument } from "../../lib/contractor-os/network-topology";

const document: TopologyDocument = {
  nodes: [
    { id: "sw-1", label: "IDF <Switch> & Core", sourceElementId: "sw-1", position: { x: 150, y: 100 }, ipAddress: "10.1.1.2", vlan: 10, segment: "CCTV" },
    { id: "cam-1", label: "Camera 1", sourceElementId: "cam-1", position: { x: 400, y: 100 } },
  ],
  links: [{ id: "cable-1", sourceId: "sw-1", targetId: "cam-1", sourceElementId: "cable-1" }],
};

test("renders portable SVG topology with links, addressing and escaped labels", () => {
  const svg = topologyToSvg(document, "Closeout Topology");
  assert.match(svg, /<svg/);
  assert.match(svg, /<line/);
  assert.match(svg, /IDF &lt;Switch&gt; &amp; Core/);
  assert.match(svg, /10\.1\.1\.2/);
  assert.match(svg, /VLAN 10/);
  assert.equal(svg.includes("replaceAll"), false);
});

test("builds closeout manifest from generated topology", () => {
  assert.deepEqual(topologyCloseoutManifest(document), { generatedFrom: "Design Studio", nodeCount: 2, linkCount: 1, includesAddressing: true });
});
