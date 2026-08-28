import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";
import { commercialReadScope, requireCommercialWriteAccess } from "./commercial-access";
import { assertFiniteDesignGeometry, type DesignGeometry } from "./design-studio";
import {
  canonicalizeDesignSnapshot,
  hashDesignSnapshot,
  type DesignProjectSnapshot,
  type SnapshotElement,
} from "./design-version-snapshot";

export type DesignVersionSummary = {
  id: string;
  designProjectId: string;
  versionNumber: number;
  snapshotHash: string;
  reason: string | null;
  createdByUserId: string;
  createdAt: Date;
};

function parseMetadata(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function parseSnapshot(snapshotJson: string, projectId: string) {
  const snapshot = JSON.parse(snapshotJson) as DesignProjectSnapshot;
  if (snapshot.schemaVersion !== 1 || snapshot.projectId !== projectId) throw new Error("Invalid design version snapshot");
  for (const element of snapshot.elements) assertFiniteDesignGeometry(element.geometry);
  return snapshot;
}

async function buildSnapshot(tx: Prisma.TransactionClient, organizationId: string, projectId: string, sourceRevision: number) {
  const floors = await tx.$queryRaw<Array<{
    id: string;
    name: string;
    levelOrder: number;
    canvasWidth: Prisma.Decimal;
    canvasHeight: Prisma.Decimal;
    scaleUnit: string;
    realUnitsPerDesignUnit: Prisma.Decimal | null;
  }>>(Prisma.sql`
    SELECT id,name,levelOrder,canvasWidth,canvasHeight,scaleUnit,realUnitsPerDesignUnit
    FROM DesignFloor
    WHERE organizationId=${organizationId} AND designProjectId=${projectId}
    ORDER BY levelOrder ASC,createdAt ASC
  `);
  const rows = await tx.$queryRaw<Array<{
    id: string;
    designFloorId: string;
    designLayerId: string;
    kind: string;
    geometryJson: string;
    metadataJson: string | null;
    schemaVersion: number;
  }>>(Prisma.sql`
    SELECT id,designFloorId,designLayerId,kind,geometryJson,metadataJson,schemaVersion
    FROM DesignElement
    WHERE organizationId=${organizationId} AND designProjectId=${projectId}
    ORDER BY id ASC
  `);

  const elements = rows.map((row) => {
    const geometry = JSON.parse(row.geometryJson) as DesignGeometry;
    assertFiniteDesignGeometry(geometry);
    return {
      id: row.id,
      floorId: row.designFloorId,
      layerId: row.designLayerId,
      kind: row.kind,
      geometry,
      metadata: parseMetadata(row.metadataJson),
      schemaVersion: row.schemaVersion,
    } satisfies SnapshotElement;
  });

  return {
    schemaVersion: 1,
    projectId,
    sourceRevision,
    floors: floors.map((floor) => ({
      id: floor.id,
      name: floor.name,
      levelOrder: floor.levelOrder,
      canvasWidth: floor.canvasWidth.toString(),
      canvasHeight: floor.canvasHeight.toString(),
      scaleUnit: floor.scaleUnit,
      realUnitsPerDesignUnit: floor.realUnitsPerDesignUnit?.toString() ?? null,
    })),
    elements,
  } satisfies DesignProjectSnapshot;
}

export async function listDesignVersions(actor: CommercialActor, projectId: string, requestedOrganizationId?: string) {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  return prisma.$queryRaw<DesignVersionSummary[]>(Prisma.sql`
    SELECT id,designProjectId,versionNumber,snapshotHash,reason,createdByUserId,createdAt
    FROM DesignVersion
    WHERE organizationId=${scope.organizationId} AND designProjectId=${projectId}
    ORDER BY versionNumber DESC
  `);
}

export async function getDesignVersionSnapshot(
  actor: CommercialActor,
  projectId: string,
  versionId: string,
  requestedOrganizationId?: string,
) {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  const rows = await prisma.$queryRaw<Array<{ snapshotJson: string }>>(Prisma.sql`
    SELECT snapshotJson FROM DesignVersion
    WHERE id=${versionId} AND organizationId=${scope.organizationId} AND designProjectId=${projectId}
    LIMIT 1
  `);
  if (!rows[0]) throw new Error("Design version not found");
  return parseSnapshot(rows[0].snapshotJson, projectId);
}

export async function createDesignVersionCheckpoint(
  actor: CommercialActor,
  input: { organizationId: string; projectId: string; expectedRevision: number; createdByUserId: string; reason?: string | null },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  return prisma.$transaction(async (tx) => {
    const projects = await tx.$queryRaw<Array<{ workingRevision: number }>>(Prisma.sql`
      SELECT workingRevision FROM DesignProject
      WHERE id=${input.projectId} AND organizationId=${organizationId}
      FOR UPDATE
    `);
    const project = projects[0];
    if (!project) throw new Error("Design project not found");
    if (project.workingRevision !== input.expectedRevision) {
      throw new Error(`Design changed elsewhere. Reload required (server revision ${project.workingRevision}).`);
    }

    const snapshot = await buildSnapshot(tx, organizationId, input.projectId, project.workingRevision);
    const snapshotJson = canonicalizeDesignSnapshot(snapshot);
    const snapshotHash = hashDesignSnapshot(snapshot);
    const existing = await tx.$queryRaw<Array<{ id: string; versionNumber: number }>>(Prisma.sql`
      SELECT id,versionNumber FROM DesignVersion
      WHERE organizationId=${organizationId} AND designProjectId=${input.projectId} AND snapshotHash=${snapshotHash}
      LIMIT 1
    `);
    if (existing[0]) return existing[0];

    const versions = await tx.$queryRaw<Array<{ nextVersion: bigint }>>(Prisma.sql`
      SELECT COALESCE(MAX(versionNumber),0)+1 AS nextVersion
      FROM DesignVersion
      WHERE organizationId=${organizationId} AND designProjectId=${input.projectId}
    `);
    const versionNumber = versions[0] ? Number(versions[0].nextVersion) : 1;
    const id = randomUUID();
    const reason = input.reason?.trim().slice(0, 255) || null;
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO DesignVersion (id,organizationId,designProjectId,versionNumber,snapshotJson,snapshotHash,reason,createdByUserId,createdAt)
      VALUES (${id},${organizationId},${input.projectId},${versionNumber},${snapshotJson},${snapshotHash},${reason},${input.createdByUserId},NOW(3))
    `);
    await tx.$executeRaw(Prisma.sql`
      UPDATE DesignProject SET currentVersionId=${id},updatedAt=NOW(3)
      WHERE id=${input.projectId} AND organizationId=${organizationId}
    `);
    return { id, versionNumber };
  });
}

export async function restoreDesignVersion(
  actor: CommercialActor,
  input: { organizationId: string; projectId: string; versionId: string; expectedRevision: number },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  return prisma.$transaction(async (tx) => {
    const projects = await tx.$queryRaw<Array<{ workingRevision: number }>>(Prisma.sql`
      SELECT workingRevision FROM DesignProject
      WHERE id=${input.projectId} AND organizationId=${organizationId}
      FOR UPDATE
    `);
    const project = projects[0];
    if (!project) throw new Error("Design project not found");
    if (project.workingRevision !== input.expectedRevision) {
      throw new Error(`Design changed elsewhere. Reload required (server revision ${project.workingRevision}).`);
    }

    const versions = await tx.$queryRaw<Array<{ snapshotJson: string }>>(Prisma.sql`
      SELECT snapshotJson FROM DesignVersion
      WHERE id=${input.versionId} AND organizationId=${organizationId} AND designProjectId=${input.projectId}
      LIMIT 1
    `);
    if (!versions[0]) throw new Error("Design version not found");
    const snapshot = parseSnapshot(versions[0].snapshotJson, input.projectId);

    const floorIds = new Set(snapshot.floors.map((floor) => floor.id));
    const layerIds = new Set(snapshot.elements.map((element) => element.layerId));
    if (floorIds.size) {
      const floors = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM DesignFloor WHERE organizationId=${organizationId} AND designProjectId=${input.projectId}
      `);
      const available = new Set(floors.map((floor) => floor.id));
      for (const floorId of floorIds) if (!available.has(floorId)) throw new Error("Version references a floor that no longer exists");
    }
    if (layerIds.size) {
      const layers = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM DesignLayer WHERE organizationId=${organizationId} AND designProjectId=${input.projectId}
      `);
      const available = new Set(layers.map((layer) => layer.id));
      for (const layerId of layerIds) if (!available.has(layerId)) throw new Error("Version references a layer that no longer exists");
    }

    await tx.$executeRaw(Prisma.sql`
      DELETE FROM DesignElement WHERE organizationId=${organizationId} AND designProjectId=${input.projectId}
    `);
    for (const element of snapshot.elements) {
      const geometryJson = JSON.stringify(element.geometry);
      const metadataJson = element.metadata ? JSON.stringify(element.metadata) : null;
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO DesignElement (id,organizationId,designProjectId,designFloorId,designLayerId,kind,geometryJson,metadataJson,schemaVersion,createdAt,updatedAt)
        VALUES (${element.id},${organizationId},${input.projectId},${element.floorId},${element.layerId},${element.kind},${geometryJson},${metadataJson},${element.schemaVersion},NOW(3),NOW(3))
      `);
    }

    const nextRevision = project.workingRevision + 1;
    await tx.$executeRaw(Prisma.sql`
      UPDATE DesignProject SET workingRevision=${nextRevision},currentVersionId=${input.versionId},updatedAt=NOW(3)
      WHERE id=${input.projectId} AND organizationId=${organizationId}
    `);
    return nextRevision;
  });
}
