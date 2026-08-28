export const DESIGN_DISCIPLINES = [
  "CCTV",
  "ACCESS_CONTROL",
  "INTRUSION",
  "NETWORK",
  "PATHWAY",
  "ANNOTATION",
] as const;

export type DesignDiscipline = (typeof DESIGN_DISCIPLINES)[number];

export const DESIGN_ELEMENT_KINDS = [
  "DEVICE",
  "WALL",
  "OBSTACLE",
  "CABLE_PATH",
  "TEXT",
  "DIMENSION",
  "ZONE",
  "GUIDE",
] as const;

export type DesignElementKind = (typeof DESIGN_ELEMENT_KINDS)[number];

export type DesignPoint = { x: number; y: number };

export type DesignGeometry = {
  schemaVersion: 1;
  points: DesignPoint[];
  rotation?: number;
  width?: number;
  height?: number;
  radius?: number;
};

export type DesignTakeoffSuggestion = {
  schemaVersion: 1;
  sourceDesignProjectId: string;
  sourceDesignVersionId?: string | null;
  sourceFloorId: string;
  sourceElementId?: string | null;
  sourceDeviceId?: string | null;
  category: string;
  itemCode?: string | null;
  description: string;
  quantity: number;
  unit: string;
  evidence: {
    floorName: string;
    discipline: DesignDiscipline;
    measuredLength?: number;
    cableType?: string;
    note?: string;
  };
};

export function assertFiniteDesignGeometry(geometry: DesignGeometry) {
  if (geometry.schemaVersion !== 1) throw new Error("Unsupported design geometry schema version");
  if (!Array.isArray(geometry.points) || geometry.points.length === 0) throw new Error("Design geometry requires at least one point");

  for (const point of geometry.points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error("Design geometry coordinates must be finite");
  }

  for (const value of [geometry.rotation, geometry.width, geometry.height, geometry.radius]) {
    if (value != null && !Number.isFinite(value)) throw new Error("Design geometry dimensions must be finite");
  }
}

export function measuredPolylineLength(points: DesignPoint[]) {
  if (points.length < 2) return 0;
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    total += Math.hypot(current.x - previous.x, current.y - previous.y);
  }
  return total;
}

export function calculateRealWorldLength(input: {
  designLength: number;
  realUnitsPerDesignUnit: number;
  slackPercent?: number;
}) {
  const { designLength, realUnitsPerDesignUnit } = input;
  const slackPercent = input.slackPercent ?? 0;
  if (!Number.isFinite(designLength) || designLength < 0) throw new Error("Design length must be a non-negative finite number");
  if (!Number.isFinite(realUnitsPerDesignUnit) || realUnitsPerDesignUnit <= 0) throw new Error("Scale ratio must be a positive finite number");
  if (!Number.isFinite(slackPercent) || slackPercent < 0) throw new Error("Slack percent must be a non-negative finite number");
  return designLength * realUnitsPerDesignUnit * (1 + slackPercent / 100);
}
