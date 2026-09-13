"use client";

import { useMemo } from "react";

import { calculateDoriZones, DEFAULT_DORI_THRESHOLDS, type DoriThreshold } from "@/lib/contractor-os/camera-dori";

type CameraDoriOverlayProps = {
  origin: { x: number; y: number };
  rotationDegrees: number;
  horizontalPixels: number;
  horizontalFovDegrees: number;
  designUnitsPerMeter: number;
  thresholds?: DoriThreshold[];
  selected?: boolean;
};

function polar(origin: { x: number; y: number }, distance: number, angleDegrees: number) {
  const radians = (angleDegrees * Math.PI) / 180;
  return { x: origin.x + Math.cos(radians) * distance, y: origin.y + Math.sin(radians) * distance };
}

function points(values: Array<{ x: number; y: number }>) {
  return values.map((value) => `${value.x},${value.y}`).join(" ");
}

export function CameraDoriOverlay({ origin, rotationDegrees, horizontalPixels, horizontalFovDegrees, designUnitsPerMeter, thresholds = DEFAULT_DORI_THRESHOLDS, selected = false }: CameraDoriOverlayProps) {
  const zones = useMemo(() => {
    try {
      return calculateDoriZones({ horizontalPixels, horizontalFovDegrees }, thresholds);
    } catch {
      return [];
    }
  }, [horizontalFovDegrees, horizontalPixels, thresholds]);

  if (!zones.length || !Number.isFinite(designUnitsPerMeter) || designUnitsPerMeter <= 0) return null;

  const halfFov = horizontalFovDegrees / 2;
  return (
    <g pointerEvents="none" aria-label="DORI pixel density coverage zones">
      {zones.map((zone, index) => {
        const distance = zone.distanceMeters * designUnitsPerMeter;
        const left = polar(origin, distance, rotationDegrees - halfFov);
        const right = polar(origin, distance, rotationDegrees + halfFov);
        return (
          <g key={`${zone.key}-${zone.minimumPpm}`}>
            <polyline
              points={points([left, right])}
              fill="none"
              stroke="currentColor"
              strokeOpacity={selected ? 0.75 : 0.42}
              strokeWidth={index === zones.length - 1 ? 2 : 1.25}
              strokeDasharray="4 4"
            />
            {selected ? (
              <text x={right.x + 5} y={right.y} fontSize="10" fill="currentColor">
                {zone.label} · {zone.minimumPpm} PPM · {zone.distanceMeters.toFixed(1)}m
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
