import type { CanvasElement } from "./design-canvas-state";
import type { DesignDiscipline } from "./design-studio";

export const BUILT_IN_DESIGN_LAYERS = [
  { id: "cctv", name: "CCTV", discipline: "CCTV" as const },
  { id: "access-control", name: "Access Control", discipline: "ACCESS_CONTROL" as const },
  { id: "intrusion", name: "Intrusion / Alarm", discipline: "INTRUSION" as const },
  { id: "network", name: "Network", discipline: "NETWORK" as const },
  { id: "pathways", name: "Pathways", discipline: "PATHWAY" as const },
] as const;

export type DesignLayer = { id: string; name: string; order: number; visible: boolean; locked: boolean; builtIn: boolean; discipline?: DesignDiscipline };
export type DesignLayerState = { layers: DesignLayer[] };
export type DesignExportProfile = { id: string; name: string; includedLayerIds: string[] };

function normalizeName(name: string) { const value = name.trim(); if (!value) throw new Error("Layer name is required"); return value; }
function normalizeOrder(layers: DesignLayer[]): DesignLayer[] { return layers.map((layer, index) => ({ ...layer, order: index })); }

export function createDefaultDesignLayerState(): DesignLayerState { return { layers: BUILT_IN_DESIGN_LAYERS.map((layer, index) => ({ ...layer, order: index, visible: true, locked: false, builtIn: true })) }; }
export function createCustomLayer(state: DesignLayerState, input: { id: string; name: string }): DesignLayerState { const id = input.id.trim(); if (!id) throw new Error("Layer ID is required"); if (state.layers.some((layer) => layer.id.toLowerCase() === id.toLowerCase())) throw new Error("Layer ID already exists"); return { layers: [...state.layers, { id, name: normalizeName(input.name), order: state.layers.length, visible: true, locked: false, builtIn: false }] }; }
export function renameLayer(state: DesignLayerState, layerId: string, name: string): DesignLayerState { const nextName = normalizeName(name); let found = false; const layers = state.layers.map((layer) => { if (layer.id !== layerId) return layer; found = true; return { ...layer, name: nextName }; }); if (!found) throw new Error("Layer not found"); return { layers }; }
export function reorderLayer(state: DesignLayerState, layerId: string, targetIndex: number): DesignLayerState { const currentIndex = state.layers.findIndex((layer) => layer.id === layerId); if (currentIndex === -1) throw new Error("Layer not found"); if (!Number.isInteger(targetIndex)) throw new Error("Target index must be an integer"); const boundedIndex = Math.max(0, Math.min(state.layers.length - 1, targetIndex)); const layers = [...state.layers]; const [moved] = layers.splice(currentIndex, 1); layers.splice(boundedIndex, 0, moved); return { layers: normalizeOrder(layers) }; }
export function setLayerVisibility(state: DesignLayerState, layerId: string, visible: boolean): DesignLayerState { return updateLayer(state, layerId, { visible }); }
export function setLayerLocked(state: DesignLayerState, layerId: string, locked: boolean): DesignLayerState { return updateLayer(state, layerId, { locked }); }
function updateLayer(state: DesignLayerState, layerId: string, patch: Partial<Pick<DesignLayer, "visible" | "locked">>): DesignLayerState { let found = false; const layers = state.layers.map((layer) => { if (layer.id !== layerId) return layer; found = true; return { ...layer, ...patch }; }); if (!found) throw new Error("Layer not found"); return { layers }; }

export function defaultLayerIdForDiscipline(discipline?: DesignDiscipline): string | undefined { return BUILT_IN_DESIGN_LAYERS.find((layer) => layer.discipline === discipline)?.id; }
export function assignElementToLayer(element: CanvasElement, state: DesignLayerState, layerId?: string): CanvasElement {
  if (!layerId) return { ...element, layerId: undefined };
  const layer = state.layers.find((candidate) => candidate.id === layerId);
  if (!layer) throw new Error("Layer not found");
  return { ...element, layerId: layer.id, discipline: element.discipline ?? layer.discipline };
}
export function applyDefaultLayer(element: CanvasElement, state: DesignLayerState): CanvasElement {
  if (element.layerId) return element;
  const layerId = defaultLayerIdForDiscipline(element.discipline);
  return layerId ? assignElementToLayer(element, state, layerId) : element;
}

export function createExportProfile(state: DesignLayerState, input: { id: string; name: string; includedLayerIds: string[] }): DesignExportProfile { const available = new Set(state.layers.map((layer) => layer.id)); const includedLayerIds = [...new Set(input.includedLayerIds.filter((id) => available.has(id)))]; return { id: input.id.trim(), name: normalizeName(input.name), includedLayerIds }; }
export function elementsForExport(elements: CanvasElement[], profile: DesignExportProfile): CanvasElement[] { const included = new Set(profile.includedLayerIds); return elements.filter((element) => !element.layerId || included.has(element.layerId)); }
export function visibleElements(elements: CanvasElement[], state: DesignLayerState): CanvasElement[] { const visibility = new Map(state.layers.map((layer) => [layer.id, layer.visible])); return elements.filter((element) => !element.layerId || visibility.get(element.layerId) !== false); }
export function isElementLayerLocked(element: CanvasElement, state: DesignLayerState): boolean { if (!element.layerId) return false; return state.layers.find((layer) => layer.id === element.layerId)?.locked ?? false; }
