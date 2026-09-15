import type { CanvasDocument, CanvasElement, TopologyConnection } from "./design-canvas-state";
import type { CableRouteSettings } from "./cable-route";
import type { CameraDoriSettings } from "./camera-dori";
import type { CameraFovParameters } from "./camera-fov";
import type { SpecializedCameraSettings } from "./camera-specialized";
import type { NetworkAddressing } from "./network-addressing";
import { designCanvasLayers } from "./design-canvas-layer-integration";

type EditableCanvasElement = CanvasElement & {
  cameraFov?: CameraFovParameters;
  cameraDori?: CameraDoriSettings;
  cameraSimulation?: SpecializedCameraSettings;
  networkAddressing?: NetworkAddressing;
  cableRoute?: CableRouteSettings;
  topologyConnection?: TopologyConnection;
};

function patchEditableElement(
  document: CanvasDocument,
  elementId: string,
  patch: Partial<EditableCanvasElement>,
): CanvasDocument {
  const element = document.elements.find((candidate) => candidate.id === elementId);
  if (!element || !designCanvasLayers.canEditGeometry(element, document.layers)) return document;
  return {
    ...document,
    elements: document.elements.map((candidate) => candidate.id === elementId ? { ...candidate, ...patch } : candidate),
  };
}

export function updateLayerSafeCameraFov(document: CanvasDocument, elementId: string, value: CameraFovParameters) {
  return patchEditableElement(document, elementId, { cameraFov: value });
}

export function updateLayerSafeCameraDori(document: CanvasDocument, elementId: string, value: CameraDoriSettings) {
  return patchEditableElement(document, elementId, { cameraDori: value });
}

export function updateLayerSafeCameraSimulation(document: CanvasDocument, elementId: string, value: SpecializedCameraSettings) {
  return patchEditableElement(document, elementId, { cameraSimulation: value });
}

export function updateLayerSafeNetworkAddressing(document: CanvasDocument, elementId: string, value: NetworkAddressing) {
  return patchEditableElement(document, elementId, { networkAddressing: value });
}

export function updateLayerSafeCableRoute(document: CanvasDocument, elementId: string, value: CableRouteSettings) {
  return patchEditableElement(document, elementId, { cableRoute: value });
}

export function updateLayerSafeTopologyConnection(document: CanvasDocument, elementId: string, value?: TopologyConnection) {
  return patchEditableElement(document, elementId, { topologyConnection: value });
}
