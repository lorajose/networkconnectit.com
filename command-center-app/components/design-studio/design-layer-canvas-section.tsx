"use client";

import { useMemo, useState } from "react";

import { DesignLayerExportProfile } from "@/components/design-studio/design-layer-export-profile";
import { DesignLayerPanel } from "@/components/design-studio/design-layer-panel";
import type { CanvasDocument } from "@/lib/contractor-os/design-canvas-state";
import { createVisibleLayerExportProfile, designElementsForLayerExport } from "@/lib/contractor-os/design-layer-export";
import type { DesignExportProfile } from "@/lib/contractor-os/design-layers";

type Props = {
  document: CanvasDocument;
  onChange: (document: CanvasDocument) => void;
};

/**
 * Canvas-facing adapter. Selection, layer management and export scope are all
 * derived from the same CanvasDocument used by rendering.
 */
export function DesignLayerCanvasSection({ document, onChange }: Props) {
  const selectedId = document.selectedIds.length === 1 ? document.selectedIds[0] : undefined;
  const selectedElement = selectedId ? document.elements.find((element) => element.id === selectedId) ?? null : null;
  const visibleProfile = useMemo(() => createVisibleLayerExportProfile(document), [document]);
  const [exportProfile, setExportProfile] = useState<DesignExportProfile>(visibleProfile);
  const effectiveProfile = useMemo(() => {
    const validLayerIds = new Set(document.layers.layers.map((layer) => layer.id));
    return {
      ...exportProfile,
      includedLayerIds: exportProfile.includedLayerIds.filter((id) => validLayerIds.has(id)),
    };
  }, [document.layers.layers, exportProfile]);
  const exportElementCount = useMemo(
    () => designElementsForLayerExport(document, effectiveProfile).length,
    [document, effectiveProfile],
  );

  return (
    <section aria-label="Design layers" className="space-y-4 rounded-2xl border bg-background p-3">
      <div>
        <h3 className="text-sm font-semibold">Design Layers</h3>
        <p className="text-xs text-muted-foreground">
          Control CCTV, access control, intrusion, network and pathway visibility without changing device discipline metadata.
        </p>
      </div>
      <DesignLayerPanel document={document} selectedElement={selectedElement} onChange={onChange} />
      <div className="rounded-xl border bg-muted/10 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide">Export layers</h4>
            <p className="text-xs text-muted-foreground">Choose which disciplines are included in the next design export.</p>
          </div>
          <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">{exportElementCount} elements</span>
        </div>
        <DesignLayerExportProfile layers={document.layers.layers} value={effectiveProfile} onChange={setExportProfile} />
        <button
          type="button"
          className="mt-2 text-xs font-medium underline underline-offset-4"
          onClick={() => setExportProfile(createVisibleLayerExportProfile(document))}
        >
          Reset to visible layers
        </button>
      </div>
    </section>
  );
}
