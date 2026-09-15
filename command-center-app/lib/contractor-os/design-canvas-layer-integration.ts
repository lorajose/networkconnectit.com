import type { CanvasDocument, CanvasElement } from "./design-canvas-state";
import { applyDefaultLayer } from "./design-layers";
import {
  applyDesignLayerState,
  assignCanvasElementLayer,
  canEditCanvasElementGeometry,
  persistedDesignSignature,
  renderableDesignElements,
} from "./design-layer-canvas";

/**
 * Single integration surface for DesignCanvas. Keeping these behaviors here
 * prevents the UI from accidentally bypassing layer visibility/lock rules.
 */
export const designCanvasLayers = {
  signature: persistedDesignSignature,
  renderableElements: renderableDesignElements,
  applyLayerState: applyDesignLayerState,
  assignElement: assignCanvasElementLayer,
  canEditGeometry: canEditCanvasElementGeometry,
};

export function withDefaultCanvasLayer(document: CanvasDocument, element: CanvasElement): CanvasElement {
  return applyDefaultLayer(element, document.layers);
}

export function createCctvCameraElement(
  document: CanvasDocument,
  element: Omit<CanvasElement, "discipline" | "category" | "layerId">,
): CanvasElement {
  return withDefaultCanvasLayer(document, {
    ...element,
    discipline: "CCTV",
    category: "CAMERA",
  });
}

export function createPathwayElement(
  document: CanvasDocument,
  element: Omit<CanvasElement, "discipline" | "category" | "layerId">,
): CanvasElement {
  return withDefaultCanvasLayer(document, {
    ...element,
    discipline: "PATHWAY",
    category: "CABLE_ROUTE",
  });
}
