import { createHash } from "node:crypto";

import type { DesignGeometry } from "./design-studio";

export type SnapshotElement = {
  id: string;
  floorId: string;
  layerId: string;
  kind: string;
  geometry: DesignGeometry;
  metadata: Record<string, unknown> | null;
  schemaVersion: number;
};

export type DesignProjectSnapshot = {
  schemaVersion: 1;
  projectId: string;
  sourceRevision: number;
  floors: Array<{
    id: string;
    name: string;
    levelOrder: number;
    canvasWidth: string;
    canvasHeight: string;
    scaleUnit: string;
    realUnitsPerDesignUnit: string | null;
  }>;
  elements: SnapshotElement[];
};

export function canonicalizeDesignSnapshot(snapshot: DesignProjectSnapshot) {
  const normalized: DesignProjectSnapshot = {
    ...snapshot,
    floors: [...snapshot.floors].sort((a, b) => a.id.localeCompare(b.id)),
    elements: [...snapshot.elements]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((element) => ({
        ...element,
        metadata: element.metadata
          ? Object.fromEntries(Object.entries(element.metadata).sort(([a], [b]) => a.localeCompare(b)))
          : null,
      })),
  };
  return JSON.stringify(normalized);
}

export function hashDesignSnapshot(snapshot: DesignProjectSnapshot) {
  return createHash("sha256").update(canonicalizeDesignSnapshot(snapshot)).digest("hex");
}
