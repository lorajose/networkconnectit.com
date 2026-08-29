import type { DesignPoint } from "./design-studio";

export type DesignGridSettings = {
  enabled: boolean;
  snapEnabled: boolean;
  spacing: number;
  origin: DesignPoint;
};

export const DEFAULT_DESIGN_GRID: DesignGridSettings = {
  enabled: true,
  snapEnabled: false,
  spacing: 20,
  origin: { x: 0, y: 0 },
};

export function assertDesignGridSettings(settings: DesignGridSettings) {
  if (!Number.isFinite(settings.spacing) || settings.spacing <= 0) {
    throw new Error("Grid spacing must be a positive finite number");
  }
  if (!Number.isFinite(settings.origin.x) || !Number.isFinite(settings.origin.y)) {
    throw new Error("Grid origin coordinates must be finite");
  }
}

export function snapDesignPoint(point: DesignPoint, settings: DesignGridSettings): DesignPoint {
  assertDesignGridSettings(settings);
  if (!settings.snapEnabled) return { ...point };
  const x = settings.origin.x + Math.round((point.x - settings.origin.x) / settings.spacing) * settings.spacing;
  const y = settings.origin.y + Math.round((point.y - settings.origin.y) / settings.spacing) * settings.spacing;
  return { x, y };
}

export function nearestAlignmentGuide(input: {
  moving: DesignPoint;
  candidates: DesignPoint[];
  threshold: number;
}) {
  if (!Number.isFinite(input.threshold) || input.threshold < 0) {
    throw new Error("Alignment threshold must be a non-negative finite number");
  }
  let bestX: number | null = null;
  let bestY: number | null = null;
  let bestDx = Number.POSITIVE_INFINITY;
  let bestDy = Number.POSITIVE_INFINITY;

  for (const candidate of input.candidates) {
    const dx = Math.abs(candidate.x - input.moving.x);
    const dy = Math.abs(candidate.y - input.moving.y);
    if (dx <= input.threshold && dx < bestDx) {
      bestDx = dx;
      bestX = candidate.x;
    }
    if (dy <= input.threshold && dy < bestDy) {
      bestDy = dy;
      bestY = candidate.y;
    }
  }

  return { x: bestX, y: bestY };
}
