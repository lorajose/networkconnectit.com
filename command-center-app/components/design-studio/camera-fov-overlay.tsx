"use client";

import { useEffect, useMemo } from "react";

import { calculateCameraCoverage, type CameraCoverage, type CameraFovParameters } from "@/lib/contractor-os/camera-fov";

type CameraFovOverlayProps = {
  origin: { x: number; y: number };
  rotationDegrees: number;
  parameters: CameraFovParameters;
  designUnitsPerMeter: number;
  selected?: boolean;
  onCoverageChange?: (coverage: CameraCoverage | null, error: string | null) => void;
};

function polygonPoints(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function CameraFovOverlay({ origin, rotationDegrees, parameters, designUnitsPerMeter, selected = false, onCoverageChange }: CameraFovOverlayProps) {
  const result = useMemo(() => {
    try {
      return { coverage: calculateCameraCoverage(origin, rotationDegrees, parameters, designUnitsPerMeter), error: null };
    } catch (error) {
      return { coverage: null, error: error instanceof Error ? error.message : "Invalid camera FOV configuration" };
    }
  }, [designUnitsPerMeter, origin.x, origin.y, parameters, rotationDegrees]);

  useEffect(() => {
    onCoverageChange?.(result.coverage, result.error);
  }, [onCoverageChange, result.coverage, result.error]);

  if (!result.coverage) {
    return selected ? (
      <g pointerEvents="none" aria-label={result.error ?? "Invalid camera FOV configuration"}>
        <circle cx={origin.x} cy={origin.y} r="28" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="5 4" />
      </g>
    ) : null;
  }

  const { coverage } = result;
  const [leftNear, leftFar, rightFar, rightNear] = coverage.polygon;

  return (
    <g pointerEvents="none" aria-label={`${coverage.fov.label}, ${coverage.fov.horizontalDegrees.toFixed(1)} degree horizontal field of view`}>
      <polygon
        points={polygonPoints([origin, leftFar, rightFar])}
        fill="#38bdf8"
        fillOpacity={selected ? 0.18 : 0.1}
        stroke="#38bdf8"
        strokeOpacity={selected ? 0.9 : 0.55}
        strokeWidth={selected ? 2 : 1.5}
      />
      <polygon
        points={polygonPoints([leftNear, leftFar, rightFar, rightNear])}
        fill="#22c55e"
        fillOpacity={selected ? 0.12 : 0.06}
        stroke="#22c55e"
        strokeOpacity={selected ? 0.8 : 0.45}
        strokeWidth="1.5"
        strokeDasharray="6 4"
      />
      {selected ? (
        <text x={origin.x + 12} y={origin.y - 16} fontSize="11" fill="#bae6fd">
          {coverage.fov.horizontalDegrees.toFixed(1)}° FOV · {coverage.farDistanceMeters.toFixed(1)}m
        </text>
      ) : null}
    </g>
  );
}
