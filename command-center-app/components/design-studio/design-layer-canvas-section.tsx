"use client";

import { DesignLayerPanel } from "@/components/design-studio/design-layer-panel";
import type { CanvasDocument } from "@/lib/contractor-os/design-canvas-state";

type Props = {
  document: CanvasDocument;
  onChange: (document: CanvasDocument) => void;
};

/**
 * Canvas-facing adapter. It deliberately derives selection from the same
 * CanvasDocument used by rendering so layer assignment cannot drift from the
 * active Design Studio selection.
 */
export function DesignLayerCanvasSection({ document, onChange }: Props) {
  const selectedId = document.selectedIds.length === 1 ? document.selectedIds[0] : undefined;
  const selectedElement = selectedId ? document.elements.find((element) => element.id === selectedId) ?? null : null;

  return (
    <section aria-label="Design layers" className="rounded-2xl border bg-background p-3">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Design Layers</h3>
        <p className="text-xs text-muted-foreground">
          Control CCTV, access control, intrusion, network and pathway visibility without changing device discipline metadata.
        </p>
      </div>
      <DesignLayerPanel document={document} selectedElement={selectedElement} onChange={onChange} />
    </section>
  );
}
