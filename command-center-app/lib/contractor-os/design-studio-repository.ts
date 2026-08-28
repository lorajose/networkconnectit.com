import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { CanvasDocument, CanvasElement } from "./design-canvas-state";
import { createCanvasDocument } from "./design-canvas-state";
import { assertFiniteDesignGeometry } from "./design-studio";
import type { CommercialActor } from "./commercial-access";
import { commercialReadScope, requireCommercialWriteAccess } from "./commercial-access";

export type DesignProjectSummary = {
  id: string;
  organizationId: string;
  name: string;
  status: string;
  workingRevision: number;
  updatedAt: Date;
};

export type DesignFloorView = {
  id: string;
  organizationId: string;
  designProjectId: string;
  name: string;
  levelOrder: number;
  canvasWidth: Prisma.Decimal;
  canvasHeight: Prisma.Decimal;
  scaleUnit: string;
  realUnitsPerDesignUnit: Prisma.Decimal | null;
  updatedAt: Date;
};

type DesignElementRow = {
  id: string;
  geometryJson: string;
  metadataJson: string | null;
};

function cleanName(value: string, label: string) {
  const name = value.trim();
  if (!name) throw new Error(`${label} is required`);
  if (name.length > 191) throw new Error(`${label} is too long`);
  return name;
}

async function assertProjectForWrite(organizationId: string, projectId: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id FROM DesignProject WHERE id=${projectId} AND organizationId=${organizationId} LIMIT 1
  `);
  if (!rows[0]) throw new Error("Design project not found");
}

async function ensureDefaultLayer(
  tx: Prisma.TransactionClient,
  organizationId: string,
  projectId: string,
  floorId: string,
) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id FROM DesignLayer
    WHERE organizationId=${organizationId} AND designProjectId=${projectId} AND designFloorId=${floorId}
    ORDER BY sortOrder ASC,createdAt ASC LIMIT 1
  `);
  if (rows[0]) return rows[0].id;
  const id = randomUUID();
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO DesignLayer (id,organizationId,designProjectId,designFloorId,discipline,name,sortOrder,isVisible,isLocked,createdAt,updatedAt)
    VALUES (${id},${organizationId},${projectId},${floorId},'CCTV','CCTV',0,TRUE,FALSE,NOW(3),NOW(3))
  `);
  return id;
}

function parseElement(row: DesignElementRow): CanvasElement {
  const geometry = JSON.parse(row.geometryJson) as CanvasElement["geometry"];
  assertFiniteDesignGeometry(geometry);
  let metadata: { locked?: boolean; hidden?: boolean } = {};
  if (row.metadataJson) {
    try {
      metadata = JSON.parse(row.metadataJson) as typeof metadata;
    } catch {
      metadata = {};
    }
  }
  return { id: row.id, geometry, locked: Boolean(metadata.locked), hidden: Boolean(metadata.hidden) };
}

export async function listDesignProjects(actor: CommercialActor, requestedOrganizationId?: string) {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  return prisma.$queryRaw<DesignProjectSummary[]>(Prisma.sql`
    SELECT id,organizationId,name,status,workingRevision,updatedAt
    FROM DesignProject
    WHERE organizationId=${scope.organizationId}
    ORDER BY updatedAt DESC
  `);
}

export async function getDesignProject(actor: CommercialActor, projectId: string, requestedOrganizationId?: string) {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  const rows = await prisma.$queryRaw<DesignProjectSummary[]>(Prisma.sql`
    SELECT id,organizationId,name,status,workingRevision,updatedAt
    FROM DesignProject
    WHERE id=${projectId} AND organizationId=${scope.organizationId}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

export async function listDesignFloors(actor: CommercialActor, projectId: string, requestedOrganizationId?: string) {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  return prisma.$queryRaw<DesignFloorView[]>(Prisma.sql`
    SELECT f.id,f.organizationId,f.designProjectId,f.name,f.levelOrder,f.canvasWidth,f.canvasHeight,
      f.scaleUnit,f.realUnitsPerDesignUnit,f.updatedAt
    FROM DesignFloor f
    JOIN DesignProject p ON p.id=f.designProjectId AND p.organizationId=f.organizationId
    WHERE f.designProjectId=${projectId} AND f.organizationId=${scope.organizationId}
    ORDER BY f.levelOrder ASC,f.createdAt ASC
  `);
}

export async function loadDesignFloorCanvas(
  actor: CommercialActor,
  projectId: string,
  floorId: string,
  requestedOrganizationId?: string,
): Promise<CanvasDocument> {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  const floorRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT f.id FROM DesignFloor f
    JOIN DesignProject p ON p.id=f.designProjectId AND p.organizationId=f.organizationId
    WHERE f.id=${floorId} AND f.designProjectId=${projectId} AND f.organizationId=${scope.organizationId}
    LIMIT 1
  `);
  if (!floorRows[0]) throw new Error("Design floor not found");
  const rows = await prisma.$queryRaw<DesignElementRow[]>(Prisma.sql`
    SELECT id,geometryJson,metadataJson FROM DesignElement
    WHERE organizationId=${scope.organizationId} AND designProjectId=${projectId} AND designFloorId=${floorId}
    ORDER BY createdAt ASC
  `);
  return createCanvasDocument(rows.map(parseElement));
}

export async function saveDesignFloorCanvas(
  actor: CommercialActor,
  input: {
    organizationId: string;
    projectId: string;
    floorId: string;
    expectedRevision: number;
    document: CanvasDocument;
  },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 1) throw new Error("Invalid working revision");
  if (input.document.schemaVersion !== 1) throw new Error("Unsupported canvas schema version");
  for (const element of input.document.elements) assertFiniteDesignGeometry(element.geometry);

  return prisma.$transaction(async (tx) => {
    const projectRows = await tx.$queryRaw<Array<{ workingRevision: number }>>(Prisma.sql`
      SELECT workingRevision FROM DesignProject
      WHERE id=${input.projectId} AND organizationId=${organizationId}
      FOR UPDATE
    `);
    const project = projectRows[0];
    if (!project) throw new Error("Design project not found");
    if (project.workingRevision !== input.expectedRevision) {
      throw new Error(`Design changed elsewhere. Reload required (server revision ${project.workingRevision}).`);
    }

    const floorRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM DesignFloor
      WHERE id=${input.floorId} AND designProjectId=${input.projectId} AND organizationId=${organizationId}
      LIMIT 1
    `);
    if (!floorRows[0]) throw new Error("Design floor not found");

    const layerId = await ensureDefaultLayer(tx, organizationId, input.projectId, input.floorId);
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM DesignElement
      WHERE organizationId=${organizationId} AND designProjectId=${input.projectId} AND designFloorId=${input.floorId}
    `);

    for (const element of input.document.elements) {
      const geometryJson = JSON.stringify(element.geometry);
      const metadataJson = JSON.stringify({ locked: Boolean(element.locked), hidden: Boolean(element.hidden) });
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO DesignElement (id,organizationId,designProjectId,designFloorId,designLayerId,kind,geometryJson,metadataJson,schemaVersion,createdAt,updatedAt)
        VALUES (${element.id},${organizationId},${input.projectId},${input.floorId},${layerId},'DEVICE',${geometryJson},${metadataJson},1,NOW(3),NOW(3))
      `);
    }

    const nextRevision = input.expectedRevision + 1;
    const changed = await tx.$executeRaw(Prisma.sql`
      UPDATE DesignProject SET workingRevision=${nextRevision},updatedAt=NOW(3)
      WHERE id=${input.projectId} AND organizationId=${organizationId} AND workingRevision=${input.expectedRevision}
    `);
    if (!changed) throw new Error("Design revision conflict");
    await tx.$executeRaw(Prisma.sql`
      UPDATE DesignFloor SET updatedAt=NOW(3)
      WHERE id=${input.floorId} AND designProjectId=${input.projectId} AND organizationId=${organizationId}
    `);
    return nextRevision;
  });
}

export async function createDesignProject(
  actor: CommercialActor,
  input: { organizationId: string; name: string; createdByUserId: string },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO DesignProject (id,organizationId,name,status,createdByUserId,workingRevision,createdAt,updatedAt)
    VALUES (${id},${organizationId},${cleanName(input.name,"Design project name")},'DRAFT',${input.createdByUserId},1,NOW(3),NOW(3))
  `);
  return id;
}

export async function createDesignFloor(
  actor: CommercialActor,
  input: { organizationId: string; projectId: string; name: string; levelOrder?: number },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  await assertProjectForWrite(organizationId, input.projectId);
  const levelOrder = input.levelOrder ?? 0;
  if (!Number.isInteger(levelOrder)) throw new Error("Floor order must be an integer");
  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO DesignFloor (id,organizationId,designProjectId,name,levelOrder,canvasWidth,canvasHeight,scaleUnit,createdAt,updatedAt)
    VALUES (${id},${organizationId},${input.projectId},${cleanName(input.name,"Floor name")},${levelOrder},1000,1000,'FT',NOW(3),NOW(3))
  `);
  await prisma.$executeRaw(Prisma.sql`
    UPDATE DesignProject SET workingRevision=workingRevision+1,updatedAt=NOW(3)
    WHERE id=${input.projectId} AND organizationId=${organizationId}
  `);
  return id;
}

export async function renameDesignFloor(
  actor: CommercialActor,
  input: { organizationId: string; projectId: string; floorId: string; name: string },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  await assertProjectForWrite(organizationId, input.projectId);
  const changed = await prisma.$executeRaw(Prisma.sql`
    UPDATE DesignFloor SET name=${cleanName(input.name,"Floor name")},updatedAt=NOW(3)
    WHERE id=${input.floorId} AND designProjectId=${input.projectId} AND organizationId=${organizationId}
  `);
  if (!changed) throw new Error("Design floor not found");
}
