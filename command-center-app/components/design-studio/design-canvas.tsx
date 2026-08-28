"use client";

import { useMemo, useRef, useState } from "react";
import { RotateCcw, RotateCw, Trash2, Undo2, Redo2, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  commitCanvas,
  createCanvasDocument,
  createCanvasHistory,
  deleteSelected,
  panCanvas,
  redoCanvas,
  rotateSelected,
  setCanvasSelection,
  translateSelected,
  undoCanvas,
  zoomCanvas,
  type CanvasDocument,
  type CanvasHistory,
} from "@/lib/contractor-os/design-canvas-state";

const starter = createCanvasDocument([
  { id: "cam-01", geometry: { schemaVersion: 1, points: [{ x: 160, y: 150 }], rotation: 0, width: 54, height: 34 } },
  { id: "cam-02", geometry: { schemaVersion: 1, points: [{ x: 360, y: 240 }], rotation: 45, width: 54, height: 34 } },
  { id: "rack-01", locked: true, geometry: { schemaVersion: 1, points: [{ x: 600, y: 180 }], rotation: 0, width: 70, height: 54 } },
]);

type DragState = { pointerId: number; lastX: number; lastY: number; mode: "move" | "pan" } | null;

export function DesignCanvas() {
  const [history, setHistory] = useState<CanvasHistory>(() => createCanvasHistory(starter));
  const [drag, setDrag] = useState<DragState>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const document = history.present;

  const selected = useMemo(() => new Set(document.selectedIds), [document.selectedIds]);

  function apply(next: CanvasDocument) {
    setHistory((current) => commitCanvas(current, next));
  }

  function toDesignPoint(clientX: number, clientY: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return {
      x: (clientX - rect.left - document.viewport.x) / document.viewport.zoom,
      y: (clientY - rect.top - document.viewport.y) / document.viewport.zoom,
    };
  }

  function beginElementDrag(event: React.PointerEvent<SVGGElement>, id: string) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    const selectedDocument = selected.has(id) ? document : setCanvasSelection(document, [id], additive);
    if (selectedDocument !== document) setHistory((current) => ({ ...current, present: selectedDocument }));
    const point = toDesignPoint(event.clientX, event.clientY);
    setDrag({ pointerId: event.pointerId, lastX: point.x, lastY: point.y, mode: "move" });
  }

  function beginPan(event: React.PointerEvent<SVGSVGElement>) {
    if (event.target !== event.currentTarget) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setHistory((current) => ({ ...current, present: setCanvasSelection(current.present, []) }));
    setDrag({ pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY, mode: "pan" });
  }

  function movePointer(event: React.PointerEvent<SVGSVGElement>) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.mode === "pan") {
      const dx = event.clientX - drag.lastX;
      const dy = event.clientY - drag.lastY;
      setHistory((current) => ({ ...current, present: panCanvas(current.present, { x: dx, y: dy }) }));
      setDrag({ ...drag, lastX: event.clientX, lastY: event.clientY });
      return;
    }

    const point = toDesignPoint(event.clientX, event.clientY);
    const dx = point.x - drag.lastX;
    const dy = point.y - drag.lastY;
    setHistory((current) => ({ ...current, present: translateSelected(current.present, { x: dx, y: dy }) }));
    setDrag({ ...drag, lastX: point.x, lastY: point.y });
  }

  function endPointer() {
    if (!drag) return;
    setHistory((current) => commitCanvas({ ...current, present: current.past.at(-1) ?? current.present }, current.present));
    setDrag(null);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      setHistory((current) => event.shiftKey ? redoCanvas(current) : undoCanvas(current));
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      apply(deleteSelected(document));
      return;
    }
    if (event.key === "ArrowLeft") apply(translateSelected(document, { x: -5, y: 0 }));
    if (event.key === "ArrowRight") apply(translateSelected(document, { x: 5, y: 0 }));
    if (event.key === "ArrowUp") apply(translateSelected(document, { x: 0, y: -5 }));
    if (event.key === "ArrowDown") apply(translateSelected(document, { x: 0, y: 5 }));
  }

  return (
    <div tabIndex={0} onKeyDown={handleKeyDown} className="overflow-hidden rounded-2xl border bg-background outline-none focus:ring-2 focus:ring-primary/40">
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 p-3">
        <Button type="button" size="sm" variant="outline" onClick={() => setHistory(undoCanvas)} disabled={!history.past.length}><Undo2 className="mr-2 h-4 w-4" />Undo</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setHistory(redoCanvas)} disabled={!history.future.length}><Redo2 className="mr-2 h-4 w-4" />Redo</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apply(rotateSelected(document, -15))} disabled={!document.selectedIds.length}><RotateCcw className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apply(rotateSelected(document, 15))} disabled={!document.selectedIds.length}><RotateCw className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apply(deleteSelected(document))} disabled={!document.selectedIds.length}><Trash2 className="h-4 w-4" /></Button>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setHistory((current) => ({ ...current, present: zoomCanvas(current.present, 0.8) }))}><ZoomOut className="h-4 w-4" /></Button>
          <span className="min-w-14 text-center text-xs text-muted-foreground">{Math.round(document.viewport.zoom * 100)}%</span>
          <Button type="button" size="sm" variant="outline" onClick={() => setHistory((current) => ({ ...current, present: zoomCanvas(current.present, 1.25) }))}><ZoomIn className="h-4 w-4" /></Button>
        </div>
      </div>

      <svg
        ref={svgRef}
        className="h-[620px] w-full touch-none select-none bg-slate-950"
        onPointerDown={beginPan}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        <defs>
          <pattern id="design-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" /></pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#design-grid)" className="text-slate-200" pointerEvents="none" />
        <g transform={`translate(${document.viewport.x} ${document.viewport.y}) scale(${document.viewport.zoom})`}>
          <rect x="70" y="70" width="700" height="420" rx="12" fill="#0f172a" stroke="#334155" strokeWidth="2" />
          <path d="M70 300 H770 M280 70 V300 M500 300 V490" stroke="#475569" strokeWidth="5" fill="none" pointerEvents="none" />
          {document.elements.filter((item) => !item.hidden).map((element) => {
            const point = element.geometry.points[0];
            const width = element.geometry.width ?? 48;
            const height = element.geometry.height ?? 32;
            const active = selected.has(element.id);
            return (
              <g key={element.id} transform={`translate(${point.x} ${point.y}) rotate(${element.geometry.rotation ?? 0})`} onPointerDown={(event) => beginElementDrag(event, element.id)} className="cursor-move">
                <rect x={-width / 2} y={-height / 2} width={width} height={height} rx="8" fill={active ? "#0ea5e9" : element.locked ? "#64748b" : "#1e293b"} stroke={active ? "#bae6fd" : "#94a3b8"} strokeWidth={active ? 3 : 2} />
                <circle cx={width / 2 - 7} cy="0" r="5" fill="#e2e8f0" />
                <text x="0" y={height / 2 + 18} textAnchor="middle" fontSize="12" fill="#cbd5e1" transform={`rotate(${-(element.geometry.rotation ?? 0)})`}>{element.id}{element.locked ? " · locked" : ""}</text>
                {active ? <circle cx="0" cy={-height / 2 - 18} r="6" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="2" /> : null}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        <span>Drag devices to move</span><span>Shift/Ctrl/Cmd + click for multi-select</span><span>Arrow keys nudge</span><span>Delete removes</span><span>Ctrl/Cmd+Z undo</span><span>Drag empty canvas to pan</span>
      </div>
    </div>
  );
}
