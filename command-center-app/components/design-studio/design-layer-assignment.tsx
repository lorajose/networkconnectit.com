"use client";

import type { CanvasElement } from "@/lib/contractor-os/design-canvas-state";
import type { DesignLayer } from "@/lib/contractor-os/design-layers";

type Props = {
  element: CanvasElement;
  layers: DesignLayer[];
  onAssign: (layerId?: string) => void;
};

export function DesignLayerAssignment({ element, layers, onAssign }: Props) {
  return (
    <label className="block rounded-xl border bg-card p-3 text-sm">
      <span className="mb-1 block font-medium">Design layer</span>
      <select
        className="w-full rounded-md border bg-background px-2 py-2"
        value={element.layerId ?? ""}
        onChange={(event) => onAssign(event.target.value || undefined)}
      >
        <option value="">Unassigned</option>
        {layers.map((layer) => <option key={layer.id} value={layer.id}>{layer.name}</option>)}
      </select>
      <span className="mt-1 block text-xs text-muted-foreground">Discipline: {element.discipline ?? "not set"} · Category: {element.category ?? "not set"}</span>
    </label>
  );
}
