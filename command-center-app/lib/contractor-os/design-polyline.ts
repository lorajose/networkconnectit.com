import type { DesignGeometry, DesignPoint } from "./design-studio";

export type PolylineKind = "WALL" | "OBSTACLE";

export type EditablePolyline = {
  id: string;
  kind: PolylineKind;
  geometry: DesignGeometry;
};

function assertPoint(point: DesignPoint) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error("Polyline point coordinates must be finite");
  }
}

export function createPolyline(input: {
  id: string;
  kind: PolylineKind;
  points: DesignPoint[];
}): EditablePolyline {
  if (!input.id.trim()) throw new Error("Polyline id is required");
  if (input.points.length < 2) throw new Error("Polyline requires at least two points");
  input.points.forEach(assertPoint);
  return {
    id: input.id,
    kind: input.kind,
    geometry: { schemaVersion: 1, points: input.points.map((point) => ({ ...point })) },
  };
}

export function appendPolylinePoint(polyline: EditablePolyline, point: DesignPoint): EditablePolyline {
  assertPoint(point);
  return {
    ...polyline,
    geometry: {
      ...polyline.geometry,
      points: [...polyline.geometry.points, { ...point }],
    },
  };
}

export function movePolylineVertex(polyline: EditablePolyline, vertexIndex: number, point: DesignPoint): EditablePolyline {
  assertPoint(point);
  if (!Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= polyline.geometry.points.length) {
    throw new Error("Polyline vertex index is out of range");
  }
  const points = polyline.geometry.points.map((current, index) => index === vertexIndex ? { ...point } : { ...current });
  return { ...polyline, geometry: { ...polyline.geometry, points } };
}

export function removePolylineVertex(polyline: EditablePolyline, vertexIndex: number): EditablePolyline {
  if (!Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= polyline.geometry.points.length) {
    throw new Error("Polyline vertex index is out of range");
  }
  if (polyline.geometry.points.length <= 2) {
    throw new Error("Polyline must keep at least two points");
  }
  return {
    ...polyline,
    geometry: {
      ...polyline.geometry,
      points: polyline.geometry.points.filter((_, index) => index !== vertexIndex).map((point) => ({ ...point })),
    },
  };
}

export function translatePolyline(polyline: EditablePolyline, delta: DesignPoint): EditablePolyline {
  assertPoint(delta);
  return {
    ...polyline,
    geometry: {
      ...polyline.geometry,
      points: polyline.geometry.points.map((point) => ({ x: point.x + delta.x, y: point.y + delta.y })),
    },
  };
}
