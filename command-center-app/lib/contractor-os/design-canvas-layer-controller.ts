import type { CanvasDocument, CanvasElement } from "./design-canvas-state";
import { canBeginLayerSafeEdit, hasLayerAwareCanvasChanges, moveLayerSafePolylineVertex } from "./design-canvas-layer-actions";
import { createCctvCameraElement, createPathwayElement, designCanvasLayers } from "./design-canvas-layer-integration";

/**
 * Integration contract consumed by the live DesignCanvas. This keeps the
 * legacy component thin while all multidisciplinary rules remain testable.
 */
export const designCanvasLayerController = {
  signature: designCanvasLayers.signature,
  hasChanges: hasLayerAwareCanvasChanges,
  renderableElements: designCanvasLayers.renderableElements,
  applyLayerState: designCanvasLayers.applyLayerState,
  assignElement: designCanvasLayers.assignElement,
  canEditGeometry: designCanvasLayers.canEditGeometry,
  canBeginEdit: canBeginLayerSafeEdit,
  movePolylineVertex: moveLayerSafePolylineVertex,
  createCamera: createCctvCameraElement,
  createPathway: createPathwayElement,
};

export function selectedRenderableElement(document: CanvasDocument): CanvasElement | null {
  if (document.selectedIds.length !== 1) return null;
  const selectedId = document.selectedIds[0];
  return designCanvasLayerController.renderableElements(document).find((element) => element.id === selectedId) ?? null;
}

export function normalizeLayerAwareSelection(document: CanvasDocument): CanvasDocument {
  const renderableIds = new Set(designCanvasLayerController.renderableElements(document).map((element) => element.id));
  const selectedIds = document.selectedIds.filter((id) => renderableIds.has(id));
  if (selectedIds.length === document.selectedIds.length) return document;
  return { ...document, selectedIds };
}
