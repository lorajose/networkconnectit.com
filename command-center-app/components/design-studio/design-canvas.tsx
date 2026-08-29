"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Plus, RotateCcw, RotateCw, Save, Trash2, Undo2, Redo2, ZoomIn, ZoomOut } from "lucide-react";

import { saveDesignCanvasAction } from "@/app/(protected)/design-studio/actions";
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
import { DEFAULT_DESIGN_GRID, snapDesignPoint, type DesignGridSettings } from "@/lib/contractor-os/design-grid";
import { createPolyline, movePolylineVertex, type PolylineKind } from "@/lib/contractor-os/design-polyline";

type DragState =
  | {
      pointerId: number;
      lastX: number;
      lastY: number;
      mode: "move" | "pan";
      startDocument: CanvasDocument;
    }
  | {
      pointerId: number;
      mode: "vertex";
      elementId: string;
      vertexIndex: number;
      startDocument: CanvasDocument;
    }
  | null;

type CanvasBackground = {
  url: string;
  mimeType: string;
  opacity: number;
  visible: boolean;
  locked: boolean;
  width: number;
  height: number;
  pdfPage?: number | null;
};

type DesignCanvasProps = {
  initialDocument?: CanvasDocument;
  organizationId?: string;
  projectId?: string;
  floorId?: string;
  initialRevision?: number;
  background?: CanvasBackground | null;
};

function persistedElementsSignature(document: CanvasDocument) {
  return JSON.stringify(document.elements);
}

function pointsAttribute(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function DesignCanvas({ initialDocument, organizationId, projectId, floorId, initialRevision, background }: DesignCanvasProps) {
  const initial = initialDocument ?? createCanvasDocument();
  const [history, setHistory] = useState<CanvasHistory>(() => createCanvasHistory(initial));
  const [revision, setRevision] = useState(initialRevision ?? 1);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveCycle, setSaveCycle] = useState(0);
  const [isSaving, startSaving] = useTransition();
  const [drag, setDrag] = useState<DragState>(null);
  const [grid, setGrid] = useState<DesignGridSettings>({ ...DEFAULT_DESIGN_GRID, spacing: 20, snapEnabled: true });
  const [drawingMode, setDrawingMode] = useState<PolylineKind | null>(null);
  const [draftPoints, setDraftPoints] = useState<Array<{ x: number; y: number }>>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const revisionRef = useRef(initialRevision ?? 1);
  const savingRef = useRef(false);
  const lastSavedElementsRef = useRef(persistedElementsSignature(initial));
  const document = history.present;
  const canPersist = Boolean(organizationId && projectId && floorId);
  const selected = useMemo(() => new Set(document.selectedIds), [document.selectedIds]);

  function apply(next: CanvasDocument) {
    setHistory((current) => commitCanvas(current, next));
    setSaveMessage(null);
  }

  function addDevice() {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `device-${Date.now()}`;
    apply({
      ...document,
      elements: [...document.elements, { id, kind: "DEVICE", geometry: { schemaVersion: 1 as const, points: [{ x: 240, y: 180 }], rotation: 0, width: 54, height: 34 } }],
      selectedIds: [id],
    });
  }

  function beginDrawing(kind: PolylineKind) {
    setDrawingMode((current) => current === kind ? null : kind);
    setDraftPoints([]);
  }

  function finishPolyline() {
    if (!drawingMode || draftPoints.length < 2) return;
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${drawingMode.toLowerCase()}-${Date.now()}`;
    const polyline = createPolyline({ id, kind: drawingMode, points: draftPoints });
    apply({
      ...document,
      elements: [...document.elements, { id: polyline.id, kind: polyline.kind, geometry: polyline.geometry }],
      selectedIds: [polyline.id],
    });
    setDraftPoints([]);
    setDrawingMode(null);
  }

  const persistCanvas = useCallback((documentToSave: CanvasDocument, source: "manual" | "autosave") => {
    if (!canPersist || !organizationId || !projectId || !floorId || savingRef.current) return;
    const signature = persistedElementsSignature(documentToSave);
    if (signature === lastSavedElementsRef.current) {
      if (source === "manual") setSaveMessage(`Saved revision ${revisionRef.current}`);
      return;
    }
    savingRef.current = true;
    if (source === "manual") setSaveMessage(null);
    startSaving(async () => {
      try {
        const result = await saveDesignCanvasAction({ organizationId, projectId, floorId, expectedRevision: revisionRef.current, document: documentToSave });
        revisionRef.current = result.revision;
        setRevision(result.revision);
        lastSavedElementsRef.current = signature;
        setSaveMessage(source === "autosave" ? `Autosaved revision ${result.revision}` : `Saved revision ${result.revision}`);
      } catch (error) {
        setSaveMessage(error instanceof Error ? error.message : "Unable to save design");
      } finally {
        savingRef.current = false;
        setSaveCycle((cycle) => cycle + 1);
      }
    });
  }, [canPersist, floorId, organizationId, projectId, startSaving]);

  function saveCanvas() { persistCanvas(document, "manual"); }

  useEffect(() => {
    if (!canPersist || drag || drawingMode || savingRef.current) return;
    if (persistedElementsSignature(document) === lastSavedElementsRef.current) return;
    const timer = window.setTimeout(() => persistCanvas(document, "autosave"), 1500);
    return () => window.clearTimeout(timer);
  }, [canPersist, document, drag, drawingMode, persistCanvas, saveCycle]);

  function toDesignPoint(clientX: number, clientY: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    const point = { x: (clientX - rect.left - document.viewport.x) / document.viewport.zoom, y: (clientY - rect.top - document.viewport.y) / document.viewport.zoom };
    return snapDesignPoint(point, grid);
  }

  function beginElementDrag(event: React.PointerEvent<SVGGElement>, id: string) {
    if (drawingMode) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    const selectedDocument = selected.has(id) ? document : setCanvasSelection(document, [id], additive);
    if (selectedDocument !== document) setHistory((current) => ({ ...current, present: selectedDocument }));
    const point = toDesignPoint(event.clientX, event.clientY);
    setDrag({ pointerId: event.pointerId, lastX: point.x, lastY: point.y, mode: "move", startDocument: selectedDocument });
  }

  function beginVertexDrag(event: React.PointerEvent<SVGCircleElement>, elementId: string, vertexIndex: number) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setHistory((current) => ({ ...current, present: setCanvasSelection(current.present, [elementId]) }));
    setDrag({ pointerId: event.pointerId, mode: "vertex", elementId, vertexIndex, startDocument: document });
  }

  function beginPan(event: React.PointerEvent<SVGSVGElement>) {
    if (event.target !== event.currentTarget) return;
    if (drawingMode) {
      const point = toDesignPoint(event.clientX, event.clientY);
      setDraftPoints((points) => [...points, point]);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const deselected = setCanvasSelection(document, []);
    setHistory((current) => ({ ...current, present: deselected }));
    setDrag({ pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY, mode: "pan", startDocument: deselected });
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
    if (drag.mode === "vertex") {
      const point = toDesignPoint(event.clientX, event.clientY);
      setHistory((current) => ({
        ...current,
        present: {
          ...current.present,
          elements: current.present.elements.map((element) => {
            if (element.id !== drag.elementId || (element.kind !== "WALL" && element.kind !== "OBSTACLE")) return element;
            const moved = movePolylineVertex({ id: element.id, kind: element.kind, geometry: element.geometry }, drag.vertexIndex, point);
            return { ...element, geometry: moved.geometry };
          }),
        },
      }));
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
    const startDocument = drag.startDocument;
    setHistory((current) => commitCanvas({ ...current, present: startDocument }, current.present));
    setDrag(null);
    setSaveMessage(null);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && drawingMode) { setDrawingMode(null); setDraftPoints([]); return; }
    if (event.key === "Enter" && drawingMode) { event.preventDefault(); finishPolyline(); return; }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); saveCanvas(); return; }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") { event.preventDefault(); setHistory((current) => event.shiftKey ? redoCanvas(current) : undoCanvas(current)); return; }
    if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); apply(deleteSelected(document)); return; }
    if (event.key === "ArrowLeft") apply(translateSelected(document, { x: -5, y: 0 }));
    if (event.key === "ArrowRight") apply(translateSelected(document, { x: 5, y: 0 }));
    if (event.key === "ArrowUp") apply(translateSelected(document, { x: 0, y: -5 }));
    if (event.key === "ArrowDown") apply(translateSelected(document, { x: 0, y: 5 }));
  }

  const imageBackground = background && background.visible && background.mimeType.startsWith("image/") ? background : null;
  const pdfBackground = background && background.visible && background.mimeType === "application/pdf" ? background : null;
  const pdfUrl = pdfBackground ? `${pdfBackground.url}#page=${pdfBackground.pdfPage ?? 1}&toolbar=0&navpanes=0&scrollbar=0&zoom=page-fit` : null;

  return (
    <div tabIndex={0} onKeyDown={handleKeyDown} className="overflow-hidden rounded-2xl border bg-background outline-none focus:ring-2 focus:ring-primary/40">
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 p-3">
        <Button type="button" size="sm" onClick={addDevice}><Plus className="mr-2 h-4 w-4" />Add device</Button>
        <Button type="button" size="sm" variant={drawingMode === "WALL" ? "default" : "outline"} onClick={() => beginDrawing("WALL")}>Wall</Button>
        <Button type="button" size="sm" variant={drawingMode === "OBSTACLE" ? "default" : "outline"} onClick={() => beginDrawing("OBSTACLE")}>Obstacle</Button>
        {drawingMode ? <Button type="button" size="sm" variant="outline" onClick={finishPolyline} disabled={draftPoints.length < 2}>Finish {drawingMode.toLowerCase()}</Button> : null}
        <Button type="button" size="sm" variant={grid.enabled ? "secondary" : "outline"} onClick={() => setGrid((current) => ({ ...current, enabled: !current.enabled }))}>Grid</Button>
        <Button type="button" size="sm" variant={grid.snapEnabled ? "secondary" : "outline"} onClick={() => setGrid((current) => ({ ...current, snapEnabled: !current.snapEnabled }))}>Snap</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setHistory(undoCanvas)} disabled={!history.past.length}><Undo2 className="mr-2 h-4 w-4" />Undo</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setHistory(redoCanvas)} disabled={!history.future.length}><Redo2 className="mr-2 h-4 w-4" />Redo</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apply(rotateSelected(document, -15))} disabled={!document.selectedIds.length}><RotateCcw className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apply(rotateSelected(document, 15))} disabled={!document.selectedIds.length}><RotateCw className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apply(deleteSelected(document))} disabled={!document.selectedIds.length}><Trash2 className="h-4 w-4" /></Button>
        {canPersist ? <Button type="button" size="sm" variant="outline" onClick={saveCanvas} disabled={isSaving}><Save className="mr-2 h-4 w-4" />{isSaving ? "Saving..." : "Save"}</Button> : null}
        {saveMessage ? <span className="text-xs text-muted-foreground">{saveMessage}</span> : null}
        <span className="text-xs text-muted-foreground">Revision {revision}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setHistory((current) => ({ ...current, present: zoomCanvas(current.present, 0.8) }))}><ZoomOut className="h-4 w-4" /></Button>
          <span className="min-w-14 text-center text-xs text-muted-foreground">{Math.round(document.viewport.zoom * 100)}%</span>
          <Button type="button" size="sm" variant="outline" onClick={() => setHistory((current) => ({ ...current, present: zoomCanvas(current.present, 1.25) }))}><ZoomIn className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="relative h-[620px] overflow-hidden bg-slate-950">
        {pdfBackground && pdfUrl ? (
          <iframe
            title={`PDF floor plan page ${pdfBackground.pdfPage ?? 1}`}
            src={pdfUrl}
            className="pointer-events-none absolute left-0 top-0 border-0 bg-white"
            style={{
              width: `${pdfBackground.width}px`,
              height: `${pdfBackground.height}px`,
              opacity: pdfBackground.opacity,
              transform: `translate(${document.viewport.x}px, ${document.viewport.y}px) scale(${document.viewport.zoom})`,
              transformOrigin: "top left",
            }}
          />
        ) : null}
        <svg ref={svgRef} className="absolute inset-0 h-full w-full touch-none select-none bg-transparent" onPointerDown={beginPan} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={endPointer}>
          <defs>
            <pattern id="design-grid" width={grid.spacing} height={grid.spacing} patternUnits="userSpaceOnUse">
              <path d={`M ${grid.spacing} 0 L 0 0 0 ${grid.spacing}`} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />
            </pattern>
          </defs>
          <g transform={`translate(${document.viewport.x} ${document.viewport.y}) scale(${document.viewport.zoom})`}>
            {grid.enabled ? <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#design-grid)" className="text-slate-200" pointerEvents="none" /> : null}
            {imageBackground ? (
              <image href={imageBackground.url} x="0" y="0" width={imageBackground.width} height={imageBackground.height} preserveAspectRatio="xMidYMid meet" opacity={imageBackground.opacity} pointerEvents="none" />
            ) : !pdfBackground ? (
              <>
                <rect x="70" y="70" width="700" height="420" rx="12" fill="#0f172a" stroke="#334155" strokeWidth="2" pointerEvents="none" />
                <path d="M70 300 H770 M280 70 V300 M500 300 V490" stroke="#475569" strokeWidth="5" fill="none" pointerEvents="none" />
              </>
            ) : null}

            {document.elements.filter((item) => !item.hidden).map((element) => {
              const active = selected.has(element.id);
              if (element.kind === "WALL" || element.kind === "OBSTACLE") {
                return (
                  <g key={element.id} onPointerDown={(event) => beginElementDrag(event, element.id)} className="cursor-move">
                    <polyline
                      points={pointsAttribute(element.geometry.points)}
                      fill="none"
                      stroke={element.kind === "WALL" ? (active ? "#38bdf8" : "#e2e8f0") : (active ? "#fb923c" : "#f59e0b")}
                      strokeWidth={element.kind === "WALL" ? 8 : 5}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {active ? element.geometry.points.map((point, vertexIndex) => (
                      <circle
                        key={`${element.id}-${vertexIndex}`}
                        cx={point.x}
                        cy={point.y}
                        r={7}
                        fill="#0ea5e9"
                        stroke="#e0f2fe"
                        strokeWidth={2}
                        className="cursor-crosshair"
                        onPointerDown={(event) => beginVertexDrag(event, element.id, vertexIndex)}
                      />
                    )) : null}
                  </g>
                );
              }

              const point = element.geometry.points[0];
              const width = element.geometry.width ?? 48;
              const height = element.geometry.height ?? 32;
              return (
                <g key={element.id} transform={`translate(${point.x} ${point.y}) rotate(${element.geometry.rotation ?? 0})`} onPointerDown={(event) => beginElementDrag(event, element.id)} className="cursor-move">
                  <rect x={-width / 2} y={-height / 2} width={width} height={height} rx="8" fill={active ? "#0ea5e9" : element.locked ? "#64748b" : "#1e293b"} stroke={active ? "#bae6fd" : "#94a3b8"} strokeWidth={active ? 3 : 2} />
                  <circle cx={width / 2 - 7} cy="0" r="5" fill="#e2e8f0" />
                  <text x="0" y={height / 2 + 18} textAnchor="middle" fontSize="12" fill="#cbd5e1" transform={`rotate(${-(element.geometry.rotation ?? 0)})`}>{element.id}{element.locked ? " · locked" : ""}</text>
                  {active ? <circle cx="0" cy={-height / 2 - 18} r="6" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="2" /> : null}
                </g>
              );
            })}

            {drawingMode && draftPoints.length ? (
              <>
                <polyline points={pointsAttribute(draftPoints)} fill="none" stroke={drawingMode === "WALL" ? "#38bdf8" : "#fb923c"} strokeWidth={drawingMode === "WALL" ? 8 : 5} strokeDasharray="10 6" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
                {draftPoints.map((point, index) => <circle key={`draft-${index}`} cx={point.x} cy={point.y} r={5} fill="#f8fafc" stroke="#0ea5e9" strokeWidth={2} pointerEvents="none" />)}
              </>
            ) : null}
          </g>
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        <span>Autosaves after 1.5s idle</span><span>Wall/Obstacle: click points, Enter or Finish to save</span><span>Selected wall vertices are draggable</span><span>Grid and Snap can be toggled</span><span>Shift/Ctrl/Cmd + click for multi-select</span><span>Ctrl/Cmd+Z undo</span><span>Ctrl/Cmd+S save</span><span>Drag empty canvas to pan</span>
        {pdfBackground ? <span>PDF page {pdfBackground.pdfPage ?? 1} is aligned beneath the interactive design layer.</span> : null}
      </div>
    </div>
  );
}
