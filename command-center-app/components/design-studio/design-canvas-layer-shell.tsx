"use client";

import { useMemo } from "react";

import { DesignLayerCanvasSection } from "@/components/design-studio/design-layer-canvas-section";
import type { CanvasDocument, CanvasElement } from "@/lib/contractor-os/design-canvas-state";
import { designCanvasLayers } from "@/lib/contractor-os/design-canvas-layer-integration";

type Props = {
  document: CanvasDocument;
  onChange: (document: CanvasDocument) => void;
  children: (context: {
    elements: CanvasElement[];
    canEditGeometry: (element: CanvasElement) => boolean;
  }) => React.ReactNode;
};

/**
 * Shared shell for the live Design Canvas. It guarantees that rendering,
 * geometry editing and the Layer Manager all consume the same CanvasDocument.
 */
export function DesignCanvasLayerShell({ document, onChange, children }: Props) {
  const elements = useMemo(() => designCanvasLayers.renderableElements(document), [document]);

  return (
    <div className="space-y-3">
      {children({
        elements,
        canEditGeometry: (element) => designCanvasLayers.canEditGeometry(element, document.layers),
      })}
      <DesignLayerCanvasSection document={document} onChange={onChange} />
    </div>
  );
}
