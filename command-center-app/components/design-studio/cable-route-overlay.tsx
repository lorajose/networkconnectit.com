"use client";

import {
  cableRouteTypeLabel,
  measureCableRoute,
  routeFromGeometry,
  type CableRouteSettings,
} from "@/lib/contractor-os/cable-route";
import type { DesignPoint } from "@/lib/contractor-os/design-studio";

type CableRouteOverlayProps = {
  id: string;
  points: DesignPoint[];
  settings: CableRouteSettings;
  designUnitsPerMeter: number;
  selected?: boolean;
  onPointerDown?: (event: React.PointerEvent<SVGGElement>) => void;
  onVertexPointerDown?: (event: React.PointerEvent<SVGCircleElement>, vertexIndex: number) => void;
};

function pointsAttribute(points: DesignPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function CableRouteOverlay({
  id,
  points,
  settings,
  designUnitsPerMeter,
  selected = false,
  onPointerDown,
  onVertexPointerDown,
}: CableRouteOverlayProps) {
  const route = routeFromGeometry(id, points, settings);
  let measurement: ReturnType<typeof measureCableRoute> | null = null;
  if (Number.isFinite(designUnitsPerMeter) && designUnitsPerMeter > 0) {
    measurement = measureCableRoute(route, 1 / designUnitsPerMeter);
  }

  const midpoint = points[Math.floor(points.length / 2)] ?? points[0];
  const label = measurement
    ? `${cableRouteTypeLabel(route)} · ${measurement.totalFeet.toFixed(1)} ft`
    : `${cableRouteTypeLabel(route)} · calibrate scale`;

  return (
    <g onPointerDown={onPointerDown} className="cursor-move">
      <polyline
        points={pointsAttribute(points)}
        fill="none"
        stroke={selected ? "#22d3ee" : "#06b6d4"}
        strokeWidth={selected ? 6 : 4}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray="10 5"
      />
      {midpoint ? (
        <g pointerEvents="none">
          <rect x={midpoint.x + 8} y={midpoint.y - 20} width={Math.max(112, label.length * 6.2)} height={22} rx={5} fill="#020617" fillOpacity={0.85} />
          <text x={midpoint.x + 14} y={midpoint.y - 5} fontSize="10" fill="#cffafe">{label}</text>
        </g>
      ) : null}
      {selected ? points.map((point, vertexIndex) => (
        <circle
          key={`${id}-${vertexIndex}`}
          cx={point.x}
          cy={point.y}
          r={7}
          fill="#0891b2"
          stroke="#cffafe"
          strokeWidth={2}
          className="cursor-crosshair"
          onPointerDown={(event) => onVertexPointerDown?.(event, vertexIndex)}
        />
      )) : null}
    </g>
  );
}
