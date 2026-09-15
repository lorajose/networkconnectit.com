import type { CanvasDocument, CanvasElement } from "./design-canvas-state";
import { movePolylineVertex, type PolylineKind } from "./design-polyline";
import { designCanvasLayers } from "./design-canvas-layer-integration";

function elementById(document: CanvasDocument, elementId: string): CanvasElement | undefined {
  return document.elements.find((element) => element.id === elementId);
}

function isPolylineKind(kind: CanvasElement["kind"]): kind is PolylineKind {
  return kind === "WALL" || kind === "OBSTACLE" || kind === "CABLE_PATH";
}

/** Returns false when a hidden/locked layer must not start a direct edit gesture. */
export function canBeginLayerSafeEdit(document: CanvasDocument, elementId: string): boolean {
  const element = elementById(document, elementId);
  if (!element) return false;
  if (!designCanvasLayers.renderableElements(document).some((candidate) => candidate.id === elementId)) return false;
  return designCanvasLayers.canEditGeometry(element, document.layers);
}

/**
 * Vertex mutation used by the Canvas pointer handler. It intentionally refuses
 * edits on locked/hidden layers and ignores non-polyline canvas elements.
 */
export function moveLayerSafePolylineVertex(
  document: CanvasDocument,
  elementId: string,
  vertexIndex: number,
  point: { x: number; y: number },
): CanvasDocument {
  if (!canBeginLayerSafeEdit(document, elementId)) return document;
  const editable = elementById(document, elementId);
  if (!editable || !isPolylineKind(editable.kind)) return document;

  return {
    ...document,
    elements: document.elements.map((element) => {
      if (element.id !== elementId || !isPolylineKind(element.kind)) return element;
      const moved = movePolylineVertex({ id: element.id, kind: element.kind, geometry: element.geometry }, vertexIndex, point);
      return { ...element, geometry: moved.geometry };
    }),
  };
}

/** Canvas autosave must include layer-only changes, not just element geometry. */
export function hasLayerAwareCanvasChanges(document: CanvasDocument, lastSavedSignature: string): boolean {
  return designCanvasLayers.signature(document) !== lastSavedSignature;
}
