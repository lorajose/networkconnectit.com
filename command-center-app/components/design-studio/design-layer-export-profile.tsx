"use client";

import { useMemo } from "react";

import type { DesignExportProfile, DesignLayer } from "@/lib/contractor-os/design-layers";

type Props = {
  layers: DesignLayer[];
  value: DesignExportProfile;
  onChange: (profile: DesignExportProfile) => void;
};

export function DesignLayerExportProfile({ layers, value, onChange }: Props) {
  const included = useMemo(() => new Set(value.includedLayerIds), [value.includedLayerIds]);

  function toggle(layerId: string, checked: boolean) {
    const next = new Set(value.includedLayerIds);
    if (checked) next.add(layerId);
    else next.delete(layerId);
    onChange({ ...value, includedLayerIds: layers.map((layer) => layer.id).filter((id) => next.has(id)) });
  }

  return (
    <section className="rounded-xl border bg-card p-3">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Export layers</h3>
        <p className="text-xs text-muted-foreground">Choose which disciplines appear in this export profile.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {layers.map((layer) => (
          <label key={layer.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={included.has(layer.id)}
              onChange={(event) => toggle(layer.id, event.target.checked)}
            />
            <span className="min-w-0 flex-1 truncate">{layer.name}</span>
            <span className="text-[10px] uppercase text-muted-foreground">{layer.discipline ?? "CUSTOM"}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
