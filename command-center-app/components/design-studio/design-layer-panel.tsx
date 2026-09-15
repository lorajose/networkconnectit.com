"use client";

import { DesignLayerAssignment } from "@/components/design-studio/design-layer-assignment";
import { DesignLayerManager } from "@/components/design-studio/design-layer-manager";
import type { CanvasDocument, CanvasElement } from "@/lib/contractor-os/design-canvas-state";
import { applyDesignLayerState, assignCanvasElementLayer } from "@/lib/contractor-os/design-layer-canvas";
import type { DesignLayer } from "@/lib/contractor-os/design-layers";

type Props = {
  document: CanvasDocument;
  selectedElement?: CanvasElement | null;
  onChange: (document: CanvasDocument) => void;
};

export function DesignLayerPanel({ document, selectedElement, onChange }: Props) {
  function updateLayers(layers: DesignLayer[]) {
    onChange(applyDesignLayerState(document, { layers }));
  }

  function assignSelected(layerId?: string) {
    if (!selectedElement) return;
    onChange(assignCanvasElementLayer(document, selectedElement.id, layerId));
  }

  return (
    <div className="space-y-3">
      <DesignLayerManager layers={document.layers.layers} onChange={updateLayers} />
      {selectedElement ? (
        <DesignLayerAssignment element={selectedElement} layers={document.layers.layers} onAssign={assignSelected} />
      ) : (
        <p className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
          Select a design element to assign it to a layer.
        </p>
      )}
    </div>
  );
}
