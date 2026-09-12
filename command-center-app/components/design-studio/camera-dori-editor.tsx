"use client";

import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateDoriZones, describePixelDensity, type DoriThreshold } from "@/lib/contractor-os/camera-dori";

export type CameraDoriSettings = {
  horizontalPixels: number;
  inspectionDistanceMeters: number;
  thresholds: DoriThreshold[];
};

type CameraDoriEditorProps = {
  horizontalFovDegrees: number;
  value: CameraDoriSettings;
  onChange: (next: CameraDoriSettings) => void;
};

function numberValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function CameraDoriEditor({ horizontalFovDegrees, value, onChange }: CameraDoriEditorProps) {
  const result = useMemo(() => {
    try {
      return {
        density: describePixelDensity({ horizontalPixels: value.horizontalPixels, horizontalFovDegrees }, value.inspectionDistanceMeters),
        zones: calculateDoriZones({ horizontalPixels: value.horizontalPixels, horizontalFovDegrees }, value.thresholds),
        error: null,
      };
    } catch (error) {
      return { density: null, zones: [], error: error instanceof Error ? error.message : "Invalid DORI configuration" };
    }
  }, [horizontalFovDegrees, value.horizontalPixels, value.inspectionDistanceMeters, value.thresholds]);

  function updateThreshold(index: number, patch: Partial<DoriThreshold>) {
    onChange({ ...value, thresholds: value.thresholds.map((threshold, current) => current === index ? { ...threshold, ...patch } : threshold) });
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold">DORI & pixel density</h3>
        <p className="text-xs text-muted-foreground">Resolution-aware coverage. Thresholds remain project-configurable and include their reference text.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1"><Label htmlFor="dori-horizontal-pixels">Horizontal resolution (px)</Label><Input id="dori-horizontal-pixels" type="number" min="1" value={value.horizontalPixels} onChange={(event) => onChange({ ...value, horizontalPixels: numberValue(event.target.value, value.horizontalPixels) })} /></div>
        <div className="space-y-1"><Label htmlFor="dori-inspection-distance">Inspect distance (m)</Label><Input id="dori-inspection-distance" type="number" min="0.1" step="0.1" value={value.inspectionDistanceMeters} onChange={(event) => onChange({ ...value, inspectionDistanceMeters: numberValue(event.target.value, value.inspectionDistanceMeters) })} /></div>
      </div>
      {result.density ? <div className="rounded-xl bg-muted/40 p-3 text-sm"><strong>{result.density.ppm.toFixed(1)} PPM</strong> · {result.density.ppf.toFixed(1)} PPF at {result.density.distanceMeters.toFixed(1)}m / {result.density.distanceFeet.toFixed(1)}ft</div> : <p className="text-sm text-destructive">{result.error}</p>}
      <div className="space-y-2">
        {value.thresholds.map((threshold, index) => {
          const zone = result.zones.find((item) => item.key === threshold.key && item.minimumPpm === threshold.minimumPpm);
          return <div key={`${threshold.key}-${index}`} className="grid gap-2 rounded-xl border p-3 md:grid-cols-[1fr_120px_1.5fr_auto] md:items-end">
            <div className="space-y-1"><Label>Label</Label><Input value={threshold.label} onChange={(event) => updateThreshold(index, { label: event.target.value })} /></div>
            <div className="space-y-1"><Label>Minimum PPM</Label><Input type="number" min="0.1" step="0.1" value={threshold.minimumPpm} onChange={(event) => updateThreshold(index, { minimumPpm: numberValue(event.target.value, threshold.minimumPpm) })} /></div>
            <div className="space-y-1"><Label>Standard / reference</Label><Input value={threshold.standardReference ?? ""} onChange={(event) => updateThreshold(index, { standardReference: event.target.value || null })} /></div>
            <div className="pb-2 text-xs text-muted-foreground">{zone ? `${zone.distanceMeters.toFixed(1)}m · ${zone.distanceFeet.toFixed(1)}ft` : "—"}</div>
          </div>;
        })}
      </div>
    </section>
  );
}
