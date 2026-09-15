import type { CanvasDocument, CanvasElement } from "./design-canvas-state";
import {
  createExportProfile,
  elementsForExport,
  type DesignExportProfile,
} from "./design-layers";

export const DEFAULT_LAYER_EXPORT_PROFILE_ID = "visible-disciplines";

/** Create a profile from the layers currently visible in Design Studio. */
export function createVisibleLayerExportProfile(document: CanvasDocument): DesignExportProfile {
  return createExportProfile(document.layers, {
    id: DEFAULT_LAYER_EXPORT_PROFILE_ID,
    name: "Visible disciplines",
    includedLayerIds: document.layers.layers.filter((layer) => layer.visible).map((layer) => layer.id),
  });
}

/**
 * Export filtering is intentionally independent from interactive visibility:
 * the caller explicitly chooses a profile, while unassigned legacy elements
 * remain included for backward compatibility.
 */
export function designElementsForLayerExport(document: CanvasDocument, profile: DesignExportProfile): CanvasElement[] {
  return elementsForExport(document.elements.filter((element) => !element.hidden), profile);
}
