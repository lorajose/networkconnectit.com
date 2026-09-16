import type { CanvasDocument, CanvasElement } from "./design-canvas-state";
import {
  assignElementToLayer,
  isElementLayerLocked,
  visibleElements,
  type DesignLayerState,
} from "./design-layers";

/**
 * Signature used by Design Studio autosave. Layer-only edits must create a
 * revision just like geometry/device edits do.
 */
export function persistedDesignSignature(document: CanvasDocument): string {
  return JSON.stringify({ elements: document.elements, layers: document.layers });
}

/** Elements that should be painted by the interactive canvas. */
export function renderableDesignElements(document: CanvasDocument): CanvasElement[] {
  return visibleElements(document.elements, document.layers).filter((element) => !element.hidden);
}

/**
 * Apply a Layer Manager state change and immediately clear selections that
 * became unavailable because a layer was hidden.
 */
export function applyDesignLayerState(document: CanvasDocument, layers: DesignLayerState): CanvasDocument {
  const next = { ...document, layers };
  const available = new Set(renderableDesignElements(next).map((element) => element.id));
  return { ...next, selectedIds: next.selectedIds.filter((id) => available.has(id)) };
}

/** Assign a selected canvas element without changing its discipline/category metadata. */
export function assignCanvasElementLayer(document: CanvasDocument, elementId: string, layerId?: string): CanvasDocument {
  if (!document.elements.some((element) => element.id === elementId)) return document;
  return {
    ...document,
    elements: document.elements.map((element) =>
      element.id === elementId ? assignElementToLayer(element, document.layers, layerId) : element,
    ),
  };
}

/** Vertex editors bypass translateSelected, so they need the same lock guard explicitly. */
export function canEditCanvasElementGeometry(element: CanvasElement, layers: DesignLayerState): boolean {
  return !element.locked && !isElementLayerLocked(element, layers);
}
