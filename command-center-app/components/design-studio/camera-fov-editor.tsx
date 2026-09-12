"use client";

import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { resolveCameraFov, type CameraFovParameters } from "@/lib/contractor-os/camera-fov";

type CameraFovEditorProps = {
  value: CameraFovParameters;
  onChange: (next: CameraFovParameters) => void;
};

function numberValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function CameraFovEditor({ value, onChange }: CameraFovEditorProps) {
  const preview = useMemo(() => {
    try {
      const resolved = resolveCameraFov(value);
      return `${resolved.label} · ${resolved.horizontalDegrees.toFixed(1)}° H × ${resolved.verticalDegrees.toFixed(1)}° V`;
    } catch (error) {
      return error instanceof Error ? error.message : "Invalid FOV configuration";
    }
  }, [value]);

  const update = (patch: Partial<CameraFovParameters>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <div>
        <h3 className="font-medium">Camera field of view</h3>
        <p className="mt-1 text-xs text-muted-foreground">{preview}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="fov-source">Optics source</Label>
          <Select id="fov-source" value={value.source} onChange={(event) => update({ source: event.target.value as CameraFovParameters["source"] })}>
            <option value="OPTICAL">Sensor + focal length</option>
            <option value="MANUAL">Manual FOV fallback</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mount-height">Mount height (m)</Label>
          <Input id="mount-height" type="number" min="0.1" step="0.1" value={value.mountingHeightMeters} onChange={(event) => update({ mountingHeightMeters: numberValue(event.target.value, value.mountingHeightMeters) })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="target-height">Target plane (m)</Label>
          <Input id="target-height" type="number" min="0" step="0.1" value={value.targetPlaneHeightMeters} onChange={(event) => update({ targetPlaneHeightMeters: numberValue(event.target.value, value.targetPlaneHeightMeters) })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tilt-down">Tilt down (°)</Label>
          <Input id="tilt-down" type="number" min="0.1" max="89.9" step="0.5" value={value.tiltDownDegrees} onChange={(event) => update({ tiltDownDegrees: numberValue(event.target.value, value.tiltDownDegrees) })} />
        </div>
      </div>

      {value.source === "OPTICAL" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="sensor-width">Sensor width (mm)</Label>
            <Input id="sensor-width" type="number" min="0.1" step="0.01" value={value.sensorWidthMm ?? ""} onChange={(event) => update({ sensorWidthMm: optionalNumber(event.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sensor-height">Sensor height (mm)</Label>
            <Input id="sensor-height" type="number" min="0.1" step="0.01" value={value.sensorHeightMm ?? ""} onChange={(event) => update({ sensorHeightMm: optionalNumber(event.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="focal-length">Focal length (mm)</Label>
            <Input id="focal-length" type="number" min="0.1" step="0.1" value={value.focalLengthMm ?? ""} onChange={(event) => update({ focalLengthMm: optionalNumber(event.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lens-min">Lens min (mm)</Label>
            <Input id="lens-min" type="number" min="0.1" step="0.1" value={value.lensMinMm ?? ""} onChange={(event) => update({ lensMinMm: optionalNumber(event.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lens-max">Lens max (mm)</Label>
            <Input id="lens-max" type="number" min="0.1" step="0.1" value={value.lensMaxMm ?? ""} onChange={(event) => update({ lensMaxMm: optionalNumber(event.target.value) })} />
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="manual-hfov">Horizontal FOV (°)</Label>
            <Input id="manual-hfov" type="number" min="0.1" max="179.8" step="0.1" value={value.manualHorizontalFovDegrees ?? ""} onChange={(event) => update({ manualHorizontalFovDegrees: optionalNumber(event.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-vfov">Vertical FOV (°)</Label>
            <Input id="manual-vfov" type="number" min="0.1" max="179.8" step="0.1" value={value.manualVerticalFovDegrees ?? ""} onChange={(event) => update({ manualVerticalFovDegrees: optionalNumber(event.target.value) })} />
          </div>
        </div>
      )}

      <div className="space-y-2 sm:max-w-xs">
        <Label htmlFor="max-range">Maximum range (m, optional)</Label>
        <Input id="max-range" type="number" min="0.1" step="0.5" value={value.maxRangeMeters ?? ""} onChange={(event) => update({ maxRangeMeters: optionalNumber(event.target.value) })} />
      </div>
    </div>
  );
}
