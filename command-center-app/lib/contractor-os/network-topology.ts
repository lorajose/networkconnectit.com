import type { CanvasElement } from "./design-canvas-state";
import type { DesignPoint } from "./design-studio";

export type TopologyNode = {
  id: string;
  label: string;
  sourceElementId: string;
  position: DesignPoint;
  ipAddress?: string;
  vlan?: number;
  segment?: string;
};

export type TopologyLink = {
  id: string;
  sourceId: string;
  targetId: string;
  sourceElementId: string;
};

export type TopologyDocument = {
  nodes: TopologyNode[];
  links: TopologyLink[];
};

export type TopologyPositionOverrides = Record<string, DesignPoint>;

function center(element: CanvasElement): DesignPoint {
  const point = element.geometry.points[0] ?? { x: 0, y: 0 };
  return { x: point.x, y: point.y };
}

export function autoLayoutTopology(nodes: TopologyNode[], columns = 4): TopologyNode[] {
  const safeColumns = Math.max(1, Math.floor(columns));
  return [...nodes]
    .sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id))
    .map((node, index) => ({ ...node, position: { x: 120 + (index % safeColumns) * 220, y: 100 + Math.floor(index / safeColumns) * 140 } }));
}

export function generateTopology(elements: CanvasElement[], overrides: TopologyPositionOverrides = {}): TopologyDocument {
  const devices = elements.filter((element) => (element.kind ?? "DEVICE") === "DEVICE" && !element.hidden);
  const nodes = devices.map((element) => ({
    id: element.id,
    label: element.id,
    sourceElementId: element.id,
    position: overrides[element.id] ? { ...overrides[element.id] } : center(element),
    ipAddress: element.networkAddressing?.ipAddress,
    vlan: element.networkAddressing?.vlan,
    segment: element.networkAddressing?.segment,
  }));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const links: TopologyLink[] = [];

  for (const route of elements.filter((element) => element.kind === "CABLE_PATH" && !element.hidden)) {
    const sourceId = route.topologyConnection?.sourceDeviceId;
    const targetId = route.topologyConnection?.targetDeviceId;
    if (!sourceId || !targetId || sourceId === targetId || !nodeIds.has(sourceId) || !nodeIds.has(targetId)) continue;
    links.push({ id: route.id, sourceId, targetId, sourceElementId: route.id });
  }

  return { nodes, links: links.sort((a, b) => a.id.localeCompare(b.id)) };
}

export function applyTopologyOverrides(document: TopologyDocument, overrides: TopologyPositionOverrides): TopologyDocument {
  return {
    ...document,
    nodes: document.nodes.map((node) => overrides[node.id] ? { ...node, position: { ...overrides[node.id] } } : node),
  };
}

export function topologyExportRows(document: TopologyDocument) {
  return document.nodes.map((node) => ({
    nodeId: node.id,
    label: node.label,
    ipAddress: node.ipAddress ?? "",
    vlan: node.vlan?.toString() ?? "",
    segment: node.segment ?? "",
    connectedTo: document.links.filter((link) => link.sourceId === node.id || link.targetId === node.id).map((link) => link.sourceId === node.id ? link.targetId : link.sourceId).sort().join("; "),
  }));
}
