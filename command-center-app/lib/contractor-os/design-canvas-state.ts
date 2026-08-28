import type { DesignGeometry, DesignPoint } from "./design-studio";

export type CanvasViewport = { x: number; y: number; zoom: number };
export type CanvasElement = { id: string; geometry: DesignGeometry; locked?: boolean; hidden?: boolean };
export type CanvasDocument = {
  schemaVersion: 1;
  viewport: CanvasViewport;
  elements: CanvasElement[];
  selectedIds: string[];
};
export type CanvasHistory = { past: CanvasDocument[]; present: CanvasDocument; future: CanvasDocument[] };

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const normalizeRotation = (rotation: number) => ((rotation % 360) + 360) % 360;

export function createCanvasDocument(elements: CanvasElement[] = []): CanvasDocument {
  return { schemaVersion: 1, viewport: { x: 0, y: 0, zoom: 1 }, elements: clone(elements), selectedIds: [] };
}

export function createCanvasHistory(document: CanvasDocument): CanvasHistory {
  return { past: [], present: clone(document), future: [] };
}

export function commitCanvas(history: CanvasHistory, next: CanvasDocument): CanvasHistory {
  if (serializeCanvas(history.present) === serializeCanvas(next)) return history;
  return { past: [...history.past, clone(history.present)], present: clone(next), future: [] };
}

export function undoCanvas(history: CanvasHistory): CanvasHistory {
  const previous = history.past.at(-1);
  if (!previous) return history;
  return { past: history.past.slice(0, -1), present: clone(previous), future: [clone(history.present), ...history.future] };
}

export function redoCanvas(history: CanvasHistory): CanvasHistory {
  const next = history.future[0];
  if (!next) return history;
  return { past: [...history.past, clone(history.present)], present: clone(next), future: history.future.slice(1) };
}

export function setCanvasSelection(document: CanvasDocument, ids: string[], additive = false): CanvasDocument {
  const available = new Set(document.elements.filter((item) => !item.hidden).map((item) => item.id));
  const selected = ids.filter((id) => available.has(id));
  const selectedIds = additive ? Array.from(new Set([...document.selectedIds, ...selected])) : Array.from(new Set(selected));
  return { ...document, selectedIds };
}

export function translateSelected(document: CanvasDocument, delta: DesignPoint): CanvasDocument {
  const selected = new Set(document.selectedIds);
  return {
    ...document,
    elements: document.elements.map((element) =>
      selected.has(element.id) && !element.locked
        ? { ...element, geometry: { ...element.geometry, points: element.geometry.points.map((point) => ({ x: point.x + delta.x, y: point.y + delta.y })) } }
        : element,
    ),
  };
}

export function rotateSelected(document: CanvasDocument, deltaDegrees: number): CanvasDocument {
  const selected = new Set(document.selectedIds);
  return {
    ...document,
    elements: document.elements.map((element) =>
      selected.has(element.id) && !element.locked
        ? { ...element, geometry: { ...element.geometry, rotation: normalizeRotation((element.geometry.rotation ?? 0) + deltaDegrees) } }
        : element,
    ),
  };
}

export function deleteSelected(document: CanvasDocument): CanvasDocument {
  const selected = new Set(document.selectedIds);
  return { ...document, elements: document.elements.filter((element) => !selected.has(element.id) || element.locked), selectedIds: [] };
}

export function panCanvas(document: CanvasDocument, delta: DesignPoint): CanvasDocument {
  return { ...document, viewport: { ...document.viewport, x: document.viewport.x + delta.x, y: document.viewport.y + delta.y } };
}

export function zoomCanvas(document: CanvasDocument, factor: number, min = 0.1, max = 8): CanvasDocument {
  if (!Number.isFinite(factor) || factor <= 0) throw new Error("Zoom factor must be positive and finite");
  const zoom = Math.min(max, Math.max(min, document.viewport.zoom * factor));
  return { ...document, viewport: { ...document.viewport, zoom } };
}

export function serializeCanvas(document: CanvasDocument): string {
  const normalized: CanvasDocument = {
    schemaVersion: 1,
    viewport: { ...document.viewport },
    elements: [...document.elements].sort((a, b) => a.id.localeCompare(b.id)).map((element) => clone(element)),
    selectedIds: [...document.selectedIds].sort(),
  };
  return JSON.stringify(normalized);
}
