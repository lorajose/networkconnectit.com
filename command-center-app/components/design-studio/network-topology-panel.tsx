"use client";

import { useMemo, useState } from "react";
import type { CanvasElement } from "../../lib/contractor-os/design-canvas-state";
import { autoLayoutTopology, generateTopology, topologyExportRows, type TopologyPositionOverrides } from "../../lib/contractor-os/network-topology";

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function NetworkTopologyPanel({ elements }: { elements: CanvasElement[] }) {
  const [overrides, setOverrides] = useState<TopologyPositionOverrides>({});
  const source = useMemo(() => generateTopology(elements, overrides), [elements, overrides]);
  const document = useMemo(() => ({ ...source, nodes: autoLayoutTopology(source.nodes).map((node) => overrides[node.id] ? { ...node, position: overrides[node.id] } : node) }), [source, overrides]);

  function exportCsv() {
    const rows = topologyExportRows(document);
    const csv = ["Node,IP,VLAN,Segment,Connected To", ...rows.map((row) => [row.label, row.ipAddress, row.vlan, row.segment, row.connectedTo].map(csvCell).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = "network-topology-closeout.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <section aria-label="Network topology" className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-200">
    <div className="mb-3 flex items-center justify-between gap-2">
      <div><strong>Network Topology</strong><div className="text-xs text-slate-400">{document.nodes.length} nodes · {document.links.length} links</div></div>
      <button type="button" onClick={exportCsv} disabled={!document.nodes.length} className="rounded border border-slate-600 px-2 py-1 text-xs disabled:opacity-40">Closeout CSV</button>
    </div>
    {!document.nodes.length ? <p className="text-xs text-slate-400">Place network/security devices to generate topology.</p> : <div className="space-y-2">
      {document.nodes.map((node) => <div key={node.id} className="rounded border border-slate-800 p-2">
        <div className="font-medium">{node.label}</div>
        <div className="text-xs text-slate-400">{[node.ipAddress, node.vlan ? `VLAN ${node.vlan}` : "", node.segment].filter(Boolean).join(" · ") || "Addressing not assigned"}</div>
        <div className="mt-1 flex gap-1">
          <button type="button" className="rounded border border-slate-700 px-1.5 py-0.5 text-[11px]" onClick={() => setOverrides((current) => ({ ...current, [node.id]: { x: node.position.x - 40, y: node.position.y } }))}>←</button>
          <button type="button" className="rounded border border-slate-700 px-1.5 py-0.5 text-[11px]" onClick={() => setOverrides((current) => ({ ...current, [node.id]: { x: node.position.x + 40, y: node.position.y } }))}>→</button>
        </div>
      </div>)}
    </div>}
  </section>;
}
