"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DESIGN_ESTIMATE_NOTICE,
  type CameraProjectionType,
  type CameraSignalType,
  type PtzPreset,
  type SpecializedCameraSettings,
} from "@/lib/contractor-os/camera-specialized";

type CameraSpecializedEditorProps = {
  value: SpecializedCameraSettings;
  onChange: (next: SpecializedCameraSettings) => void;
};

function numeric(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function CameraSpecializedEditor({ value, onChange }: CameraSpecializedEditorProps) {
  function updatePreset(index: number, patch: Partial<PtzPreset>) {
    const ptz = value.ptz ?? { panStartDegrees: 0, panEndDegrees: 360, presets: [] };
    onChange({ ...value, ptz: { ...ptz, presets: ptz.presets.map((preset, current) => current === index ? { ...preset, ...patch } : preset) } });
  }

  function addPreset() {
    const ptz = value.ptz ?? { panStartDegrees: 0, panEndDegrees: 360, presets: [] };
    const nextIndex = ptz.presets.length + 1;
    onChange({
      ...value,
      ptz: {
        ...ptz,
        presets: [...ptz.presets, { id: `preset-${nextIndex}`, label: `Preset ${nextIndex}`, panDegrees: 0, tiltDegrees: 0, zoom: 1, home: ptz.presets.length === 0 }],
      },
    });
  }

  const ir = value.ir ?? { enabled: false, rangeMeters: 30, beamAngleDegrees: 90 };
  const ptz = value.ptz ?? { panStartDegrees: 0, panEndDegrees: 360, presets: [] };

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold">Specialized camera simulation</h3>
        <p className="text-xs text-muted-foreground">IR, PTZ and fisheye/360 coverage are design estimates, not manufacturer-certified performance.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="camera-signal-type">Signal type</Label>
          <select id="camera-signal-type" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.signalType} onChange={(event) => onChange({ ...value, signalType: event.target.value as CameraSignalType })}>
            <option value="IP">IP</option>
            <option value="ANALOG">Analog</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="camera-projection">Coverage model</Label>
          <select id="camera-projection" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.projection} onChange={(event) => onChange({ ...value, projection: event.target.value as CameraProjectionType, ptz: event.target.value === "PTZ" ? ptz : value.ptz })}>
            <option value="RECTILINEAR">Fixed / varifocal</option>
            <option value="FISHEYE_180">Fisheye 180°</option>
            <option value="PANORAMIC_360">Panoramic 360°</option>
            <option value="PTZ">PTZ</option>
          </select>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={ir.enabled} onChange={(event) => onChange({ ...value, ir: { ...ir, enabled: event.target.checked } })} />
          IR illumination overlay
        </label>
        {ir.enabled ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="ir-range">IR range (m)</Label><Input id="ir-range" type="number" min="0.1" step="0.1" value={ir.rangeMeters} onChange={(event) => onChange({ ...value, ir: { ...ir, rangeMeters: numeric(event.target.value, ir.rangeMeters) } })} /></div>
            <div className="space-y-1"><Label htmlFor="ir-beam">IR beam angle (°)</Label><Input id="ir-beam" type="number" min="1" max="360" value={ir.beamAngleDegrees ?? 360} onChange={(event) => onChange({ ...value, ir: { ...ir, beamAngleDegrees: numeric(event.target.value, ir.beamAngleDegrees ?? 360) } })} /></div>
          </div>
        ) : null}
      </div>

      {value.projection === "PTZ" ? (
        <div className="space-y-3 rounded-xl border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="ptz-start">Pan start (°)</Label><Input id="ptz-start" type="number" value={ptz.panStartDegrees} onChange={(event) => onChange({ ...value, ptz: { ...ptz, panStartDegrees: numeric(event.target.value, ptz.panStartDegrees) } })} /></div>
            <div className="space-y-1"><Label htmlFor="ptz-end">Pan end (°)</Label><Input id="ptz-end" type="number" value={ptz.panEndDegrees} onChange={(event) => onChange({ ...value, ptz: { ...ptz, panEndDegrees: numeric(event.target.value, ptz.panEndDegrees) } })} /></div>
          </div>
          <div className="space-y-2">
            {ptz.presets.map((preset, index) => (
              <div key={preset.id} className="grid gap-2 rounded-lg border p-2 md:grid-cols-[1fr_110px_110px_90px_auto] md:items-end">
                <div className="space-y-1"><Label>Preset</Label><Input value={preset.label} onChange={(event) => updatePreset(index, { label: event.target.value })} /></div>
                <div className="space-y-1"><Label>Pan °</Label><Input type="number" value={preset.panDegrees} onChange={(event) => updatePreset(index, { panDegrees: numeric(event.target.value, preset.panDegrees) })} /></div>
                <div className="space-y-1"><Label>Tilt °</Label><Input type="number" min="-90" max="90" value={preset.tiltDegrees ?? 0} onChange={(event) => updatePreset(index, { tiltDegrees: numeric(event.target.value, preset.tiltDegrees ?? 0) })} /></div>
                <div className="space-y-1"><Label>Zoom</Label><Input type="number" min="0.1" step="0.1" value={preset.zoom ?? 1} onChange={(event) => updatePreset(index, { zoom: numeric(event.target.value, preset.zoom ?? 1) })} /></div>
                <label className="flex items-center gap-2 pb-2 text-xs"><input type="checkbox" checked={Boolean(preset.home)} onChange={(event) => updatePreset(index, { home: event.target.checked })} />Home</label>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={addPreset}>Add PTZ preset</Button>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">{DESIGN_ESTIMATE_NOTICE.label}</p>
    </section>
  );
}
