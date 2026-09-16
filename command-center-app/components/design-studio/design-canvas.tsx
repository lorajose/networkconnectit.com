"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Plus, RotateCcw, RotateCw, Save, Trash2, Undo2, Redo2, ZoomIn, ZoomOut } from "lucide-react";

import { saveDesignCanvasAction } from "@/app/(protected)/design-studio/actions";
import { CableRouteBomHandoff } from "@/components/design-studio/cable-route-bom-handoff";
import { CableRouteEditor } from "@/components/design-studio/cable-route-editor";
import { CableRouteOverlay } from "@/components/design-studio/cable-route-overlay";
import { CableRouteTotals } from "@/components/design-studio/cable-route-totals";
import { CameraDoriEditor } from "@/components/design-studio/camera-dori-editor";
import { CameraDoriOverlay } from "@/components/design-studio/camera-dori-overlay";
import { CameraFovEditor } from "@/components/design-studio/camera-fov-editor";
import { CameraFovOverlay } from "@/components/design-studio/camera-fov-overlay";
import { CameraSpecializedEditor } from "@/components/design-studio/camera-specialized-editor";
import { CameraSpecializedOverlay } from "@/components/design-studio/camera-specialized-overlay";
import { DesignLayerCanvasSection } from "@/components/design-studio/design-layer-canvas-section";
import { NetworkAddressingEditor } from "@/components/design-studio/network-addressing-editor";
import { NetworkSegmentPanel } from "@/components/design-studio/network-segment-panel";
import { NetworkTopologyPanel } from "@/components/design-studio/network-topology-panel";
import { TopologyConnectionEditor } from "@/components/design-studio/topology-connection-editor";
import { Button } from "@/components/ui/button";
import { DEFAULT_CABLE_ROUTE_SETTINGS, measureCableRoute, routeFromGeometry, type CableRouteBomCandidate, type CableRouteSettings } from "@/lib/contractor-os/cable-route";
import { DEFAULT_DORI_THRESHOLDS, type CameraDoriSettings } from "@/lib/contractor-os/camera-dori";
import { resolveCameraFov, type CameraFovParameters } from "@/lib/contractor-os/camera-fov";
import type { SpecializedCameraSettings } from "@/lib/contractor-os/camera-specialized";
import { canBeginLayerSafeEdit, moveLayerSafePolylineVertex } from "@/lib/contractor-os/design-canvas-layer-actions";
import { createCctvCameraElement, createPathwayElement, designCanvasLayers } from "@/lib/contractor-os/design-canvas-layer-integration";
import { updateLayerSafeCableRoute, updateLayerSafeCameraDori, updateLayerSafeCameraFov, updateLayerSafeCameraSimulation, updateLayerSafeNetworkAddressing, updateLayerSafeTopologyConnection } from "@/lib/contractor-os/design-canvas-layer-editing";
import { commitCanvas, createCanvasDocument, createCanvasHistory, deleteSelected, panCanvas, redoCanvas, rotateSelected, setCanvasSelection, translateSelected, undoCanvas, zoomCanvas, type CanvasDocument, type CanvasHistory, type TopologyConnection } from "@/lib/contractor-os/design-canvas-state";
import { DEFAULT_DESIGN_GRID, snapDesignPoint, type DesignGridSettings } from "@/lib/contractor-os/design-grid";
import { createPolyline, type PolylineKind } from "@/lib/contractor-os/design-polyline";
import { detectIpConflicts, type AddressedDevice, type NetworkAddressing } from "@/lib/contractor-os/network-addressing";

type DragState =
  | { pointerId: number; lastX: number; lastY: number; mode: "move" | "pan"; startDocument: CanvasDocument }
  | { pointerId: number; mode: "vertex"; elementId: string; vertexIndex: number; startDocument: CanvasDocument }
  | null;

type CanvasBackground = { url: string; mimeType: string; opacity: number; visible: boolean; locked: boolean; width: number; height: number; pdfPage?: number | null };
type DesignCanvasProps = { initialDocument?: CanvasDocument; organizationId?: string; projectId?: string; floorId?: string; initialRevision?: number; background?: CanvasBackground | null; designUnitsPerMeter?: number };

const DEFAULT_CAMERA_FOV: CameraFovParameters = { source: "OPTICAL", sensorWidthMm: 4.8, sensorHeightMm: 3.6, focalLengthMm: 4, lensMinMm: 2.8, lensMaxMm: 12, mountingHeightMeters: 3, targetPlaneHeightMeters: 0, tiltDownDegrees: 45, maxRangeMeters: 20 };
const DEFAULT_CAMERA_DORI: CameraDoriSettings = { horizontalPixels: 3840, inspectionDistanceMeters: 10, thresholds: DEFAULT_DORI_THRESHOLDS.map((threshold) => ({ ...threshold })) };
const DEFAULT_CAMERA_SIMULATION: SpecializedCameraSettings = { signalType: "IP", projection: "RECTILINEAR", ir: { enabled: false, rangeMeters: 30, beamAngleDegrees: 90 }, ptz: { panStartDegrees: 0, panEndDegrees: 360, presets: [] } };

function pointsAttribute(points: Array<{ x: number; y: number }>) { return points.map((point) => `${point.x},${point.y}`).join(" "); }
function horizontalFov(parameters: CameraFovParameters | undefined) { if (!parameters) return null; try { return resolveCameraFov(parameters).horizontalDegrees; } catch { return null; } }
function cloneRouteSettings(settings: CableRouteSettings): CableRouteSettings { return { ...settings, factors: { ...settings.factors } }; }

export function DesignCanvas({ initialDocument, organizationId, projectId, floorId, initialRevision, background, designUnitsPerMeter = 0 }: DesignCanvasProps) {
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
  const [preparedBomCandidate, setPreparedBomCandidate] = useState<CableRouteBomCandidate | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const revisionRef = useRef(initialRevision ?? 1);
  const savingRef = useRef(false);
  const lastSavedElementsRef = useRef(designCanvasLayers.signature(initial));
  const document = history.present;
  const canPersist = Boolean(organizationId && projectId && floorId);
  const selected = useMemo(() => new Set(document.selectedIds), [document.selectedIds]);
  const renderableElements = useMemo(() => designCanvasLayers.renderableElements(document), [document]);
  const selectedCamera = useMemo(() => renderableElements.find((element) => element.kind === "DEVICE" && selected.has(element.id)) ?? null, [renderableElements, selected]);
  const selectedCableRoute = useMemo(() => renderableElements.find((element) => element.kind === "CABLE_PATH" && selected.has(element.id)) ?? null, [renderableElements, selected]);
  const cableRoutes = useMemo(() => document.elements.filter((element) => element.kind === "CABLE_PATH").map((element) => ({ id: element.id, points: element.geometry.points, settings: cloneRouteSettings(element.cableRoute ?? DEFAULT_CABLE_ROUTE_SETTINGS) })), [document.elements]);
  const addressedDevices = useMemo<AddressedDevice[]>(() => document.elements.filter((element) => element.kind === "DEVICE").map((element) => ({ id: element.id, label: element.id, addressing: element.networkAddressing ?? {} })), [document.elements]);
  const topologyDeviceOptions = useMemo(() => addressedDevices.map((device) => ({ id: device.id, label: device.label })), [addressedDevices]);
  const ipConflicts = useMemo(() => detectIpConflicts(addressedDevices), [addressedDevices]);
  const selectedIpConflict = useMemo(() => Boolean(selectedCamera && ipConflicts.some((conflict) => conflict.deviceIds.includes(selectedCamera.id))), [ipConflicts, selectedCamera]);
  const selectedHorizontalFov = horizontalFov(selectedCamera?.cameraFov ?? DEFAULT_CAMERA_FOV);
  const selectedCableMeasurement = useMemo(() => {
    if (!selectedCableRoute || !Number.isFinite(designUnitsPerMeter) || designUnitsPerMeter <= 0) return null;
    return measureCableRoute(routeFromGeometry(selectedCableRoute.id, selectedCableRoute.geometry.points, selectedCableRoute.cableRoute ?? DEFAULT_CABLE_ROUTE_SETTINGS), 1 / designUnitsPerMeter);
  }, [designUnitsPerMeter, selectedCableRoute]);

  function apply(next: CanvasDocument) { setHistory((current) => commitCanvas(current, next)); setSaveMessage(null); setPreparedBomCandidate(null); }

  function addDevice() {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `device-${Date.now()}`;
    const camera = createCctvCameraElement(document, { id, kind: "DEVICE", geometry: { schemaVersion: 1, points: [{ x: 240, y: 180 }], rotation: 0, width: 54, height: 34 }, cameraFov: { ...DEFAULT_CAMERA_FOV }, cameraDori: { ...DEFAULT_CAMERA_DORI, thresholds: DEFAULT_CAMERA_DORI.thresholds.map((threshold) => ({ ...threshold })) }, cameraSimulation: { ...DEFAULT_CAMERA_SIMULATION, ir: DEFAULT_CAMERA_SIMULATION.ir ? { ...DEFAULT_CAMERA_SIMULATION.ir } : null, ptz: DEFAULT_CAMERA_SIMULATION.ptz ? { ...DEFAULT_CAMERA_SIMULATION.ptz, presets: [] } : null }, networkAddressing: {} });
    apply({ ...document, elements: [...document.elements, camera], selectedIds: [id] });
  }

  function updateSelectedCameraFov(next: CameraFovParameters) { if (selectedCamera) apply(updateLayerSafeCameraFov(document, selectedCamera.id, next)); }
  function updateSelectedCameraDori(next: CameraDoriSettings) { if (selectedCamera) apply(updateLayerSafeCameraDori(document, selectedCamera.id, next)); }
  function updateSelectedCameraSimulation(next: SpecializedCameraSettings) { if (selectedCamera) apply(updateLayerSafeCameraSimulation(document, selectedCamera.id, next)); }
  function updateSelectedNetworkAddressing(next: NetworkAddressing) { if (selectedCamera) apply(updateLayerSafeNetworkAddressing(document, selectedCamera.id, next)); }
  function updateSelectedCableRoute(next: CableRouteSettings) { if (selectedCableRoute) apply(updateLayerSafeCableRoute(document, selectedCableRoute.id, cloneRouteSettings(next))); }
  function updateSelectedTopologyConnection(next?: TopologyConnection) { if (selectedCableRoute) apply(updateLayerSafeTopologyConnection(document, selectedCableRoute.id, next)); }

  function beginDrawing(kind: PolylineKind) { setDrawingMode((current) => current === kind ? null : kind); setDraftPoints([]); }
  function finishPolyline() {
    if (!drawingMode || draftPoints.length < 2) return;
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${drawingMode.toLowerCase()}-${Date.now()}`;
    const polyline = createPolyline({ id, kind: drawingMode, points: draftPoints });
    const element = drawingMode === "CABLE_PATH"
      ? createPathwayElement(document, { id: polyline.id, kind: polyline.kind, geometry: polyline.geometry, cableRoute: cloneRouteSettings(DEFAULT_CABLE_ROUTE_SETTINGS) })
      : { id: polyline.id, kind: polyline.kind, geometry: polyline.geometry };
    apply({ ...document, elements: [...document.elements, element], selectedIds: [polyline.id] });
    setDraftPoints([]); setDrawingMode(null);
  }

  const persistCanvas = useCallback((documentToSave: CanvasDocument, source: "manual" | "autosave") => {
    if (!canPersist || !organizationId || !projectId || !floorId || savingRef.current) return;
    const signature = designCanvasLayers.signature(documentToSave);
    if (signature === lastSavedElementsRef.current) { if (source === "manual") setSaveMessage(`Saved revision ${revisionRef.current}`); return; }
    savingRef.current = true; if (source === "manual") setSaveMessage(null);
    startSaving(async () => {
      try {
        const result = await saveDesignCanvasAction({ organizationId, projectId, floorId, expectedRevision: revisionRef.current, document: documentToSave });
        revisionRef.current = result.revision; setRevision(result.revision); lastSavedElementsRef.current = signature;
        setSaveMessage(source === "autosave" ? `Autosaved revision ${result.revision}` : `Saved revision ${result.revision}`);
      } catch (error) { setSaveMessage(error instanceof Error ? error.message : "Unable to save design"); }
      finally { savingRef.current = false; setSaveCycle((cycle) => cycle + 1); }
    });
  }, [canPersist, floorId, organizationId, projectId, startSaving]);

  function saveCanvas() { persistCanvas(document, "manual"); }
  useEffect(() => {
    if (!canPersist || drag || drawingMode || savingRef.current) return;
    if (designCanvasLayers.signature(document) === lastSavedElementsRef.current) return;
    const timer = window.setTimeout(() => persistCanvas(document, "autosave"), 1500);
    return () => window.clearTimeout(timer);
  }, [canPersist, document, drag, drawingMode, persistCanvas, saveCycle]);

  function toDesignPoint(clientX: number, clientY: number) {
    const rect = svgRef.current?.getBoundingClientRect(); if (!rect) return { x: clientX, y: clientY };
    return snapDesignPoint({ x: (clientX - rect.left - document.viewport.x) / document.viewport.zoom, y: (clientY - rect.top - document.viewport.y) / document.viewport.zoom }, grid);
  }
  function beginElementDrag(event: React.PointerEvent<SVGGElement>, id: string) {
    if (drawingMode || !canBeginLayerSafeEdit(document, id)) return;
    event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    const selectedDocument = selected.has(id) ? document : setCanvasSelection(document, [id], additive);
    if (selectedDocument !== document) setHistory((current) => ({ ...current, present: selectedDocument }));
    const point = toDesignPoint(event.clientX, event.clientY);
    setDrag({ pointerId: event.pointerId, lastX: point.x, lastY: point.y, mode: "move", startDocument: selectedDocument });
  }
  function beginVertexDrag(event: React.PointerEvent<SVGCircleElement>, elementId: string, vertexIndex: number) {
    if (!canBeginLayerSafeEdit(document, elementId)) return;
    event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
    const selectedDocument = setCanvasSelection(document, [elementId]);
    setHistory((current) => ({ ...current, present: selectedDocument }));
    setDrag({ pointerId: event.pointerId, mode: "vertex", elementId, vertexIndex, startDocument: selectedDocument });
  }
  function beginPan(event: React.PointerEvent<SVGSVGElement>) {
    if (event.target !== event.currentTarget) return;
    if (drawingMode) { setDraftPoints((points) => [...points, toDesignPoint(event.clientX, event.clientY)]); return; }
    event.currentTarget.setPointerCapture(event.pointerId);
    const deselected = setCanvasSelection(document, []); setHistory((current) => ({ ...current, present: deselected }));
    setDrag({ pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY, mode: "pan", startDocument: deselected });
  }
  function movePointer(event: React.PointerEvent<SVGSVGElement>) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.mode === "pan") {
      const dx = event.clientX - drag.lastX, dy = event.clientY - drag.lastY;
      setHistory((current) => ({ ...current, present: panCanvas(current.present, { x: dx, y: dy }) }));
      setDrag({ ...drag, lastX: event.clientX, lastY: event.clientY }); return;
    }
    if (drag.mode === "vertex") {
      const point = toDesignPoint(event.clientX, event.clientY);
      setHistory((current) => ({ ...current, present: moveLayerSafePolylineVertex(current.present, drag.elementId, drag.vertexIndex, point) })); return;
    }
    const point = toDesignPoint(event.clientX, event.clientY), dx = point.x - drag.lastX, dy = point.y - drag.lastY;
    setHistory((current) => ({ ...current, present: translateSelected(current.present, { x: dx, y: dy }) }));
    setDrag({ ...drag, lastX: point.x, lastY: point.y });
  }
  function endPointer() { if (!drag) return; const startDocument = drag.startDocument; setHistory((current) => commitCanvas({ ...current, present: startDocument }, current.present)); setDrag(null); setSaveMessage(null); }
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

  return <div className="space-y-3">
    <div tabIndex={0} onKeyDown={handleKeyDown} className="overflow-hidden rounded-2xl border bg-background outline-none focus:ring-2 focus:ring-primary/40">
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 p-3">
        <Button type="button" size="sm" onClick={addDevice}><Plus className="mr-2 h-4 w-4" />Add camera</Button>
        <Button type="button" size="sm" variant={drawingMode === "WALL" ? "default" : "outline"} onClick={() => beginDrawing("WALL")}>Wall</Button>
        <Button type="button" size="sm" variant={drawingMode === "OBSTACLE" ? "default" : "outline"} onClick={() => beginDrawing("OBSTACLE")}>Obstacle</Button>
        <Button type="button" size="sm" variant={drawingMode === "CABLE_PATH" ? "default" : "outline"} onClick={() => beginDrawing("CABLE_PATH")}>Cable Route</Button>
        {drawingMode ? <Button type="button" size="sm" variant="outline" onClick={finishPolyline} disabled={draftPoints.length < 2}>Finish {drawingMode === "CABLE_PATH" ? "cable route" : drawingMode.toLowerCase()}</Button> : null}
        <Button type="button" size="sm" variant={grid.enabled ? "secondary" : "outline"} onClick={() => setGrid((current) => ({ ...current, enabled: !current.enabled }))}>Grid</Button>
        <Button type="button" size="sm" variant={grid.snapEnabled ? "secondary" : "outline"} onClick={() => setGrid((current) => ({ ...current, snapEnabled: !current.snapEnabled }))}>Snap</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setHistory(undoCanvas)} disabled={!history.past.length}><Undo2 className="mr-2 h-4 w-4" />Undo</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setHistory(redoCanvas)} disabled={!history.future.length}><Redo2 className="mr-2 h-4 w-4" />Redo</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apply(rotateSelected(document, -15))} disabled={!document.selectedIds.length}><RotateCcw className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apply(rotateSelected(document, 15))} disabled={!document.selectedIds.length}><RotateCw className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apply(deleteSelected(document))} disabled={!document.selectedIds.length}><Trash2 className="h-4 w-4" /></Button>
        {canPersist ? <Button type="button" size="sm" variant="outline" onClick={saveCanvas} disabled={isSaving}><Save className="mr-2 h-4 w-4" />{isSaving ? "Saving..." : "Save"}</Button> : null}
        {saveMessage ? <span className="text-xs text-muted-foreground">{saveMessage}</span> : null}<span className="text-xs text-muted-foreground">Revision {revision}</span>
        <div className="ml-auto flex items-center gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setHistory((current) => ({ ...current, present: zoomCanvas(current.present, 0.8) }))}><ZoomOut className="h-4 w-4" /></Button><span className="min-w-14 text-center text-xs text-muted-foreground">{Math.round(document.viewport.zoom * 100)}%</span><Button type="button" size="sm" variant="outline" onClick={() => setHistory((current) => ({ ...current, present: zoomCanvas(current.present, 1.25) }))}><ZoomIn className="h-4 w-4" /></Button></div>
      </div>
      <div className="relative h-[620px] overflow-hidden bg-slate-950">
        {pdfBackground && pdfUrl ? <iframe title={`PDF floor plan page ${pdfBackground.pdfPage ?? 1}`} src={pdfUrl} className="pointer-events-none absolute left-0 top-0 border-0 bg-white" style={{ width: `${pdfBackground.width}px`, height: `${pdfBackground.height}px`, opacity: pdfBackground.opacity, transform: `translate(${document.viewport.x}px, ${document.viewport.y}px) scale(${document.viewport.zoom})`, transformOrigin: "top left" }} /> : null}
        <svg ref={svgRef} className="absolute inset-0 h-full w-full touch-none select-none bg-transparent" onPointerDown={beginPan} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={endPointer}>
          <defs><pattern id="design-grid" width={grid.spacing} height={grid.spacing} patternUnits="userSpaceOnUse"><path d={`M ${grid.spacing} 0 L 0 0 0 ${grid.spacing}`} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" /></pattern></defs>
          <g transform={`translate(${document.viewport.x} ${document.viewport.y}) scale(${document.viewport.zoom})`}>
            {grid.enabled ? <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#design-grid)" className="text-slate-200" pointerEvents="none" /> : null}
            {imageBackground ? <image href={imageBackground.url} x="0" y="0" width={imageBackground.width} height={imageBackground.height} preserveAspectRatio="xMidYMid meet" opacity={imageBackground.opacity} pointerEvents="none" /> : !pdfBackground ? <><rect x="70" y="70" width="700" height="420" rx="12" fill="#0f172a" stroke="#334155" strokeWidth="2" pointerEvents="none" /><path d="M70 300 H770 M280 70 V300 M500 300 V490" stroke="#475569" strokeWidth="5" fill="none" pointerEvents="none" /></> : null}
            {renderableElements.map((element) => {
              const active = selected.has(element.id);
              if (element.kind === "CABLE_PATH") return <CableRouteOverlay key={element.id} id={element.id} points={element.geometry.points} settings={element.cableRoute ?? DEFAULT_CABLE_ROUTE_SETTINGS} designUnitsPerMeter={designUnitsPerMeter} selected={active} onPointerDown={(event) => beginElementDrag(event, element.id)} onVertexPointerDown={(event, vertexIndex) => beginVertexDrag(event, element.id, vertexIndex)} />;
              if (element.kind === "WALL" || element.kind === "OBSTACLE") return <g key={element.id} onPointerDown={(event) => beginElementDrag(event, element.id)} className="cursor-move"><polyline points={pointsAttribute(element.geometry.points)} fill="none" stroke={element.kind === "WALL" ? (active ? "#38bdf8" : "#e2e8f0") : (active ? "#fb923c" : "#f59e0b")} strokeWidth={element.kind === "WALL" ? 8 : 5} strokeLinejoin="round" strokeLinecap="round" />{active ? element.geometry.points.map((point, vertexIndex) => <circle key={`${element.id}-${vertexIndex}`} cx={point.x} cy={point.y} r={7} fill="#0ea5e9" stroke="#e0f2fe" strokeWidth={2} className="cursor-crosshair" onPointerDown={(event) => beginVertexDrag(event, element.id, vertexIndex)} />) : null}</g>;
              const point = element.geometry.points[0], width = element.geometry.width ?? 48, height = element.geometry.height ?? 32, resolvedHorizontalFov = horizontalFov(element.cameraFov), simulation = element.cameraSimulation ?? DEFAULT_CAMERA_SIMULATION;
              return <g key={element.id}>{element.cameraFov ? <CameraFovOverlay origin={point} rotationDegrees={element.geometry.rotation ?? 0} parameters={element.cameraFov} designUnitsPerMeter={designUnitsPerMeter} selected={active} /> : null}{element.cameraDori && resolvedHorizontalFov ? <CameraDoriOverlay origin={point} rotationDegrees={element.geometry.rotation ?? 0} horizontalPixels={element.cameraDori.horizontalPixels} horizontalFovDegrees={resolvedHorizontalFov} designUnitsPerMeter={designUnitsPerMeter} thresholds={element.cameraDori.thresholds} selected={active} /> : null}<CameraSpecializedOverlay origin={point} rotationDegrees={element.geometry.rotation ?? 0} settings={simulation} designUnitsPerMeter={designUnitsPerMeter} rangeMeters={element.cameraFov?.maxRangeMeters ?? DEFAULT_CAMERA_FOV.maxRangeMeters ?? 20} selected={active} /><g transform={`translate(${point.x} ${point.y}) rotate(${element.geometry.rotation ?? 0})`} onPointerDown={(event) => beginElementDrag(event, element.id)} className="cursor-move"><rect x={-width / 2} y={-height / 2} width={width} height={height} rx="8" fill={active ? "#0ea5e9" : element.locked ? "#64748b" : "#1e293b"} stroke={active ? "#bae6fd" : "#94a3b8"} strokeWidth={active ? 3 : 2} /><circle cx={width / 2 - 7} cy="0" r="5" fill="#e2e8f0" /><text x="0" y={height / 2 + 18} textAnchor="middle" fontSize="12" fill="#cbd5e1" transform={`rotate(${-(element.geometry.rotation ?? 0)})`}>{element.id}{element.locked ? " · locked" : ""}</text>{active ? <circle cx="0" cy={-height / 2 - 18} r="6" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="2" /> : null}</g></g>;
            })}
            {drawingMode && draftPoints.length ? <><polyline points={pointsAttribute(draftPoints)} fill="none" stroke={drawingMode === "WALL" ? "#38bdf8" : drawingMode === "CABLE_PATH" ? "#06b6d4" : "#fb923c"} strokeWidth={drawingMode === "WALL" ? 8 : drawingMode === "CABLE_PATH" ? 4 : 5} strokeDasharray={drawingMode === "CABLE_PATH" ? "10 5" : "10 6"} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />{draftPoints.map((point, index) => <circle key={`draft-${index}`} cx={point.x} cy={point.y} r={5} fill="#f8fafc" stroke={drawingMode === "CABLE_PATH" ? "#06b6d4" : "#0ea5e9"} strokeWidth={2} pointerEvents="none" />)}</> : null}
          </g>
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground"><span>Autosaves after 1.5s idle</span><span>Layer visibility and locks apply live</span><span>Wall/Obstacle/Cable Route: click waypoints, Enter or Finish to save</span><span>Selected polyline vertices are draggable</span><span>Cable lengths require calibrated scale</span><span>Ctrl/Cmd+Z undo</span><span>Ctrl/Cmd+S save</span><span>Drag empty canvas to pan</span>{pdfBackground ? <span>PDF page {pdfBackground.pdfPage ?? 1} is aligned beneath the interactive design layer.</span> : null}</div>
    </div>

    <DesignLayerCanvasSection document={document} onChange={apply} />

    {selectedCamera ? <div className="space-y-3"><CameraFovEditor value={selectedCamera.cameraFov ?? DEFAULT_CAMERA_FOV} onChange={updateSelectedCameraFov} />{selectedHorizontalFov ? <CameraDoriEditor horizontalFovDegrees={selectedHorizontalFov} value={selectedCamera.cameraDori ?? DEFAULT_CAMERA_DORI} onChange={updateSelectedCameraDori} /> : null}<CameraSpecializedEditor value={selectedCamera.cameraSimulation ?? DEFAULT_CAMERA_SIMULATION} onChange={updateSelectedCameraSimulation} /><NetworkAddressingEditor value={selectedCamera.networkAddressing ?? {}} onChange={updateSelectedNetworkAddressing} conflict={selectedIpConflict} /></div> : selectedCableRoute ? <div className="space-y-3"><CableRouteEditor value={selectedCableRoute.cableRoute ?? DEFAULT_CABLE_ROUTE_SETTINGS} onChange={updateSelectedCableRoute} measurement={selectedCableMeasurement} /><TopologyConnectionEditor value={selectedCableRoute.topologyConnection} devices={topologyDeviceOptions} onChange={updateSelectedTopologyConnection} /><CableRouteBomHandoff id={selectedCableRoute.id} points={selectedCableRoute.geometry.points} settings={selectedCableRoute.cableRoute ?? DEFAULT_CABLE_ROUTE_SETTINGS} designUnitsPerMeter={designUnitsPerMeter} onPrepare={setPreparedBomCandidate} />{preparedBomCandidate ? <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 text-xs">BOM proposal ready for human approval: <strong>{preparedBomCandidate.cableType}</strong> · {preparedBomCandidate.quantityFeet.toFixed(1)} ft ({preparedBomCandidate.quantityMeters.toFixed(2)} m). No BOM quantity has been committed.</div> : null}</div> : <p className="text-xs text-muted-foreground">Select a camera or cable route to edit its design parameters.</p>}
    <CableRouteTotals routes={cableRoutes} designUnitsPerMeter={designUnitsPerMeter} />
    <NetworkSegmentPanel devices={addressedDevices} />
    <NetworkTopologyPanel elements={document.elements} />
  </div>;
}
