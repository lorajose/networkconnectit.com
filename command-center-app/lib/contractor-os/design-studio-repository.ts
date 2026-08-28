import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
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
