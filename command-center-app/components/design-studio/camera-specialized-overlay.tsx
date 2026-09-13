"use client";

import { useMemo } from "react";

import {
  calculateIrCoverage,
  calculateProjectionCoverage,
  calculatePtzCoverage,
  type PolarCoverage,
  type SpecializedCameraSettings,
} from "@/lib/contractor-os/camera-specialized";

type CameraSpecializedOverlayProps = {
  origin: { x: number; y: number };
  rotationDegrees: number;
  settings: SpecializedCameraSettings;
  designUnitsPerMeter: number;
  rangeMeters: number;
  selected?: boolean;
};

function polar(origin: { x: number; y: number }, radius: number, angleDegrees: number) {
  const radians = (angleDegrees * Math.PI) / 180;
  return { x: origin.x + Math.cos(radians) * radius, y: origin.y + Math.sin(radians) * radius };
}

function sectorPath(origin: { x: number; y: number }, coverage: PolarCoverage, unitsPerMeter: number) {
  const radius = coverage.radiusMeters * unitsPerMeter;
  if (coverage.kind === "CIRCLE") return null;
  const start = polar(origin, radius, coverage.startDegrees);
  const end = polar(origin, radius, coverage.endDegrees);
  const sweep = ((coverage.endDegrees - coverage.startDegrees) % 360 + 360) % 360 || 360;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${origin.x} ${origin.y} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export function CameraSpecializedOverlay({ origin, rotationDegrees, settings, designUnitsPerMeter, rangeMeters, selected = false }: CameraSpecializedOverlayProps) {
  const result = useMemo(() => {
    if (!Number.isFinite(designUnitsPerMeter) || designUnitsPerMeter <= 0) return { projection: null, ir: null, error: null };
    try {
      const ir = settings.ir ? calculateIrCoverage(settings.ir, rotationDegrees) : null;
      const projection = settings.projection === "PTZ"
        ? settings.ptz ? calculatePtzCoverage(settings.ptz, rangeMeters) : null
        : settings.projection === "RECTILINEAR"
          ? null
          : calculateProjectionCoverage(settings.projection, rotationDegrees, rangeMeters);
      return { projection, ir, error: null };
    } catch (error) {
      return { projection: null, ir: null, error: error instanceof Error ? error.message : "Invalid specialized camera configuration" };
    }
  }, [designUnitsPerMeter, rangeMeters, rotationDegrees, settings]);

  if (!result.projection && !result.ir && !result.error) return null;

  function renderCoverage(coverage: PolarCoverage, kind: "projection" | "ir") {
    const radius = coverage.radiusMeters * designUnitsPerMeter;
    const path = sectorPath(origin, coverage, designUnitsPerMeter);
    const stroke = kind === "ir" ? "#a78bfa" : "#f59e0b";
    const fill = kind === "ir" ? "#8b5cf6" : "#f59e0b";
    return coverage.kind === "CIRCLE" ? (
      <circle cx={origin.x} cy={origin.y} r={radius} fill={fill} fillOpacity={selected ? 0.08 : 0.04} stroke={stroke} strokeOpacity={selected ? 0.9 : 0.5} strokeWidth={1.5} strokeDasharray={kind === "ir" ? "5 5" : "8 5"} />
    ) : (
      <path d={path ?? undefined} fill={fill} fillOpacity={selected ? 0.08 : 0.04} stroke={stroke} strokeOpacity={selected ? 0.9 : 0.5} strokeWidth={1.5} strokeDasharray={kind === "ir" ? "5 5" : "8 5"} />
    );
  }

  return (
    <g pointerEvents="none" aria-label="Specialized camera simulation coverage">
      {result.projection ? renderCoverage(result.projection, "projection") : null}
      {result.ir ? renderCoverage(result.ir, "ir") : null}
      {settings.projection === "PTZ" && settings.ptz ? settings.ptz.presets.map((preset) => {
        const radius = Math.max(18, rangeMeters * designUnitsPerMeter * 0.72);
        const end = polar(origin, radius, preset.panDegrees);
        return <line key={preset.id} x1={origin.x} y1={origin.y} x2={end.x} y2={end.y} stroke={preset.home ? "#22c55e" : "#f8fafc"} strokeOpacity={selected ? 0.85 : 0.35} strokeWidth={preset.home ? 2 : 1} strokeDasharray="3 4" />;
      }) : null}
      {selected && (result.projection || result.ir) ? (
        <text x={origin.x + 14} y={origin.y + 34} fontSize="10" fill="#f8fafc">
          Design estimate · verify manufacturer specs & field conditions
        </text>
      ) : null}
      {selected && result.error ? <text x={origin.x + 14} y={origin.y + 34} fontSize="10" fill="#f87171">{result.error}</text> : null}
    </g>
  );
}
