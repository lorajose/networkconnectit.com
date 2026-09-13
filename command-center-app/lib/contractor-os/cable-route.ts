import type { DesignPoint } from "./design-studio";

export const CABLE_ROUTE_TYPES = ["CAT6", "CAT6A", "COAX", "FIBER", "ALARM", "CUSTOM"] as const;
export type CableRouteType = (typeof CABLE_ROUTE_TYPES)[number];

export type CableRouteFactors = {
  verticalRiseMeters: number;
  serviceLoopMeters: number;
  wastePercent: number;
};

export type CableRouteSettings = {
  cableType: CableRouteType;
  customCableType?: string;
  factors: CableRouteFactors;
};

export type CableRoute = CableRouteSettings & {
  id: string;
  points: DesignPoint[];
};

export const DEFAULT_CABLE_ROUTE_SETTINGS: CableRouteSettings = {
  cableType: "CAT6",
  factors: { verticalRiseMeters: 3, serviceLoopMeters: 1, wastePercent: 10 },
};

export type CableRouteMeasurement = {
  horizontalMeters: number;
  verticalRiseMeters: number;
  serviceLoopMeters: number;
  wasteMeters: number;
  totalMeters: number;
  totalFeet: number;
};

export type CableRouteTotal = {
  cableType: string;
  routeCount: number;
  totalMeters: number;
  totalFeet: number;
};

const FEET_PER_METER = 3.280839895013123;

function requireNonNegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be non-negative and finite`);
}

export function polylineLengthDesignUnits(points: DesignPoint[]): number {
  if (points.length < 2) return 0;
  return points.slice(1).reduce((total, point, index) => {
    const previous = points[index];
    return total + Math.hypot(point.x - previous.x, point.y - previous.y);
  }, 0);
}

export function routeFromGeometry(id: string, points: DesignPoint[], settings: CableRouteSettings): CableRoute {
  return {
    id,
    points: points.map((point) => ({ ...point })),
    cableType: settings.cableType,
    customCableType: settings.customCableType,
    factors: { ...settings.factors },
  };
}

export function measureCableRoute(route: CableRoute, metersPerDesignUnit: number): CableRouteMeasurement {
  if (!Number.isFinite(metersPerDesignUnit) || metersPerDesignUnit <= 0) {
    throw new Error("A positive calibrated plan scale is required");
  }
  requireNonNegative(route.factors.verticalRiseMeters, "Vertical rise");
  requireNonNegative(route.factors.serviceLoopMeters, "Service loop");
  requireNonNegative(route.factors.wastePercent, "Waste percent");

  const horizontalMeters = polylineLengthDesignUnits(route.points) * metersPerDesignUnit;
  const subtotal = horizontalMeters + route.factors.verticalRiseMeters + route.factors.serviceLoopMeters;
  const wasteMeters = subtotal * (route.factors.wastePercent / 100);
  const totalMeters = subtotal + wasteMeters;
  return {
    horizontalMeters,
    verticalRiseMeters: route.factors.verticalRiseMeters,
    serviceLoopMeters: route.factors.serviceLoopMeters,
    wasteMeters,
    totalMeters,
    totalFeet: totalMeters * FEET_PER_METER,
  };
}

export function cableRouteTypeLabel(route: CableRoute): string {
  return route.cableType === "CUSTOM" ? route.customCableType?.trim() || "Custom" : route.cableType;
}

export function totalCableRoutes(routes: CableRoute[], metersPerDesignUnit: number): CableRouteTotal[] {
  const totals = new Map<string, CableRouteTotal>();
  for (const route of routes) {
    const label = cableRouteTypeLabel(route);
    const measurement = measureCableRoute(route, metersPerDesignUnit);
    const current = totals.get(label) ?? { cableType: label, routeCount: 0, totalMeters: 0, totalFeet: 0 };
    current.routeCount += 1;
    current.totalMeters += measurement.totalMeters;
    current.totalFeet += measurement.totalFeet;
    totals.set(label, current);
  }
  return [...totals.values()].sort((a, b) => a.cableType.localeCompare(b.cableType));
}

export type CableRouteBomCandidate = {
  sourceRouteId: string;
  cableType: string;
  quantityMeters: number;
  quantityFeet: number;
  requiresHumanApproval: true;
};

export function createCableRouteBomCandidate(route: CableRoute, metersPerDesignUnit: number): CableRouteBomCandidate {
  const measurement = measureCableRoute(route, metersPerDesignUnit);
  return {
    sourceRouteId: route.id,
    cableType: cableRouteTypeLabel(route),
    quantityMeters: measurement.totalMeters,
    quantityFeet: measurement.totalFeet,
    requiresHumanApproval: true,
  };
}
