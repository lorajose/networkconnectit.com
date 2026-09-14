import type { TopologyDocument } from "./network-topology";

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function topologyToSvg(document: TopologyDocument, title = "Network Topology"): string {
  const width = Math.max(800, ...document.nodes.map((node) => node.position.x + 180));
  const height = Math.max(500, ...document.nodes.map((node) => node.position.y + 120));
  const byId = new Map(document.nodes.map((node) => [node.id, node]));
  const links = document.links.map((link) => {
    const source = byId.get(link.sourceId);
    const target = byId.get(link.targetId);
    if (!source || !target) return "";
    return `<line x1="${source.position.x}" y1="${source.position.y}" x2="${target.position.x}" y2="${target.position.y}" stroke="#64748b" stroke-width="2" />`;
  }).join("");
  const nodes = document.nodes.map((node) => {
    const detail = [node.ipAddress, node.vlan ? `VLAN ${node.vlan}` : "", node.segment].filter(Boolean).join(" · ");
    return `<g transform="translate(${node.position.x - 70} ${node.position.y - 28})"><rect width="140" height="56" rx="8" fill="#0f172a" stroke="#38bdf8"/><text x="10" y="22" fill="#f8fafc" font-family="sans-serif" font-size="12">${escapeXml(node.label)}</text><text x="10" y="41" fill="#94a3b8" font-family="sans-serif" font-size="9">${escapeXml(detail)}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#020617"/><text x="24" y="32" fill="#f8fafc" font-family="sans-serif" font-size="18" font-weight="700">${escapeXml(title)}</text>${links}${nodes}</svg>`;
}

export function topologyCloseoutManifest(document: TopologyDocument) {
  return {
    generatedFrom: "Design Studio",
    nodeCount: document.nodes.length,
    linkCount: document.links.length,
    includesAddressing: document.nodes.some((node) => Boolean(node.ipAddress || node.vlan || node.segment)),
  };
}
