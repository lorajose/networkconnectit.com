import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";
import { commercialReadScope, requireCommercialWriteAccess } from "./commercial-access";
import {
  createEditableBomInput,
  normalizeTakeoffItem,
  type TakeoffCategory,
  type TakeoffItemInput,
  type TakeoffSource,
} from "./takeoff";

export type TakeoffWorkspaceSummary = {
  id: string;
  organizationId: string;
  bidWorkspaceId: string | null;
  estimateId: string | null;
  name: string;
  status: string;
  notes: string | null;
  itemCount: bigint;
  updatedAt: Date;
};

export type TakeoffItemView = {
  id: string;
  category: TakeoffCategory;
  itemCode: string | null;
  description: string;
  unit: string;
  countedQuantity: Prisma.Decimal;
  overrideQuantity: Prisma.Decimal | null;
  sheetReference: string | null;
  drawingRevision: string | null;
  notes: string | null;
  source: TakeoffSource;
};

export type TakeoffBomItemView = {
  id: string;
  takeoffItemId: string | null;
  catalogCode: string | null;
  description: string;
  unit: string;
  generatedQuantity: Prisma.Decimal;
  overrideQuantity: Prisma.Decimal | null;
  costRuleKey: string | null;
  notes: string | null;
};

export type TakeoffWorkspaceDetail = Omit<TakeoffWorkspaceSummary, "itemCount"> & {
  items: TakeoffItemView[];
  bomItems: TakeoffBomItemView[];
};

function cleanName(value: string) {
  const name = value.trim();
  if (!name) throw new Error("Takeoff name is required");
  if (name.length > 191) throw new Error("Takeoff name is too long");
  return name;
}

async function assertOptionalTenantLink(
  table: "BidWorkspace" | "Estimate",
  id: string | null | undefined,
  organizationId: string,
) {
  if (!id) return;
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id FROM ${Prisma.raw(table)} WHERE id = ${id} AND organizationId = ${organizationId} LIMIT 1
  `);
  if (!rows[0]) throw new Error(`${table} does not belong to the selected organization`);
}

async function assertWorkspaceForWrite(organizationId: string, workspaceId: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id FROM TakeoffWorkspace WHERE id = ${workspaceId} AND organizationId = ${organizationId} LIMIT 1
  `);
  if (!rows[0]) throw new Error("Takeoff workspace not found");
}

export async function listTakeoffWorkspaces(actor: CommercialActor, requestedOrganizationId?: string) {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  return prisma.$queryRaw<TakeoffWorkspaceSummary[]>(Prisma.sql`
    SELECT w.id,w.organizationId,w.bidWorkspaceId,w.estimateId,w.name,w.status,w.notes,
      COUNT(i.id) AS itemCount,w.updatedAt
    FROM TakeoffWorkspace w
    LEFT JOIN TakeoffItem i ON i.takeoffWorkspaceId=w.id AND i.organizationId=w.organizationId
    WHERE w.organizationId=${scope.organizationId}
    GROUP BY w.id
    ORDER BY w.updatedAt DESC
  `);
}

export async function getTakeoffWorkspace(
  actor: CommercialActor,
  workspaceId: string,
  requestedOrganizationId?: string,
): Promise<TakeoffWorkspaceDetail | null> {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  const rows = await prisma.$queryRaw<Array<Omit<TakeoffWorkspaceSummary, "itemCount">>>(Prisma.sql`
    SELECT id,organizationId,bidWorkspaceId,estimateId,name,status,notes,updatedAt
    FROM TakeoffWorkspace WHERE id=${workspaceId} AND organizationId=${scope.organizationId} LIMIT 1
  `);
  const workspace = rows[0];
  if (!workspace) return null;

  const [items, bomItems] = await Promise.all([
    prisma.$queryRaw<TakeoffItemView[]>(Prisma.sql`
      SELECT id,category,itemCode,description,unit,countedQuantity,overrideQuantity,sheetReference,drawingRevision,notes,source
      FROM TakeoffItem WHERE takeoffWorkspaceId=${workspaceId} AND organizationId=${scope.organizationId}
      ORDER BY createdAt ASC
    `),
    prisma.$queryRaw<TakeoffBomItemView[]>(Prisma.sql`
      SELECT id,takeoffItemId,catalogCode,description,unit,generatedQuantity,overrideQuantity,costRuleKey,notes
      FROM TakeoffBomItem WHERE takeoffWorkspaceId=${workspaceId} AND organizationId=${scope.organizationId}
      ORDER BY createdAt ASC
    `),
  ]);

  return { ...workspace, items, bomItems };
}

export async function createTakeoffWorkspace(
  actor: CommercialActor,
  input: {
    organizationId: string;
    name: string;
    bidWorkspaceId?: string | null;
    estimateId?: string | null;
    notes?: string | null;
  },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  const bidWorkspaceId = input.bidWorkspaceId?.trim() || null;
  const estimateId = input.estimateId?.trim() || null;
  await assertOptionalTenantLink("BidWorkspace", bidWorkspaceId, organizationId);
  await assertOptionalTenantLink("Estimate", estimateId, organizationId);

  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO TakeoffWorkspace (id,organizationId,bidWorkspaceId,estimateId,name,status,notes,createdAt,updatedAt)
    VALUES (${id},${organizationId},${bidWorkspaceId},${estimateId},${cleanName(input.name)},'DRAFT',${input.notes?.trim() || null},NOW(3),NOW(3))
  `);
  return id;
}

export async function addTakeoffItem(
  actor: CommercialActor,
  organizationIdInput: string,
  workspaceId: string,
  input: TakeoffItemInput,
) {
  const organizationId = requireCommercialWriteAccess(actor, organizationIdInput.trim());
  await assertWorkspaceForWrite(organizationId, workspaceId);
  const item = normalizeTakeoffItem(input);
  const bom = createEditableBomInput(item);
  const itemId = randomUUID();
  const bomId = randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO TakeoffItem (id,organizationId,takeoffWorkspaceId,category,itemCode,description,unit,countedQuantity,overrideQuantity,sheetReference,drawingRevision,notes,source,createdAt,updatedAt)
      VALUES (${itemId},${organizationId},${workspaceId},${item.category},${item.itemCode ?? null},${item.description},${item.unit},${item.countedQuantity},${item.overrideQuantity ?? null},${item.sheetReference ?? null},${item.drawingRevision ?? null},${item.notes ?? null},${item.source ?? "MANUAL"},NOW(3),NOW(3))
    `);
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO TakeoffBomItem (id,organizationId,takeoffWorkspaceId,takeoffItemId,catalogCode,description,unit,generatedQuantity,overrideQuantity,costRuleKey,notes,createdAt,updatedAt)
      VALUES (${bomId},${organizationId},${workspaceId},${itemId},${bom.catalogCode},${bom.description},${bom.unit},${bom.generatedQuantity},NULL,${bom.costRuleKey},${bom.notes},NOW(3),NOW(3))
    `);
    await tx.$executeRaw(Prisma.sql`UPDATE TakeoffWorkspace SET updatedAt=NOW(3) WHERE id=${workspaceId} AND organizationId=${organizationId}`);
  });
  return itemId;
}

export async function updateTakeoffItemQuantity(
  actor: CommercialActor,
  input: { organizationId: string; workspaceId: string; itemId: string; overrideQuantity: number | null },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  await assertWorkspaceForWrite(organizationId, input.workspaceId);
  if (input.overrideQuantity != null && (!Number.isFinite(input.overrideQuantity) || input.overrideQuantity < 0)) {
    throw new Error("Override quantity must be zero or greater");
  }
  const changed = await prisma.$executeRaw(Prisma.sql`
    UPDATE TakeoffItem SET overrideQuantity=${input.overrideQuantity},updatedAt=NOW(3)
    WHERE id=${input.itemId} AND takeoffWorkspaceId=${input.workspaceId} AND organizationId=${organizationId}
  `);
  if (!changed) throw new Error("Takeoff item not found");
  await prisma.$executeRaw(Prisma.sql`
    UPDATE TakeoffBomItem b
    JOIN TakeoffItem i ON i.id=b.takeoffItemId AND i.organizationId=b.organizationId
    SET b.generatedQuantity=COALESCE(i.overrideQuantity,i.countedQuantity),b.updatedAt=NOW(3)
    WHERE b.takeoffItemId=${input.itemId} AND b.takeoffWorkspaceId=${input.workspaceId} AND b.organizationId=${organizationId}
  `);
}

export async function updateBomOverride(
  actor: CommercialActor,
  input: { organizationId: string; workspaceId: string; bomItemId: string; overrideQuantity: number | null },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  await assertWorkspaceForWrite(organizationId, input.workspaceId);
  if (input.overrideQuantity != null && (!Number.isFinite(input.overrideQuantity) || input.overrideQuantity < 0)) {
    throw new Error("BOM override must be zero or greater");
  }
  const changed = await prisma.$executeRaw(Prisma.sql`
    UPDATE TakeoffBomItem SET overrideQuantity=${input.overrideQuantity},updatedAt=NOW(3)
    WHERE id=${input.bomItemId} AND takeoffWorkspaceId=${input.workspaceId} AND organizationId=${organizationId}
  `);
  if (!changed) throw new Error("BOM item not found");
}

export async function deleteTakeoffItem(
  actor: CommercialActor,
  organizationIdInput: string,
  workspaceId: string,
  itemId: string,
) {
  const organizationId = requireCommercialWriteAccess(actor, organizationIdInput.trim());
  await assertWorkspaceForWrite(organizationId, workspaceId);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`DELETE FROM TakeoffBomItem WHERE takeoffItemId=${itemId} AND takeoffWorkspaceId=${workspaceId} AND organizationId=${organizationId}`);
    const changed = await tx.$executeRaw(Prisma.sql`DELETE FROM TakeoffItem WHERE id=${itemId} AND takeoffWorkspaceId=${workspaceId} AND organizationId=${organizationId}`);
    if (!changed) throw new Error("Takeoff item not found");
    await tx.$executeRaw(Prisma.sql`UPDATE TakeoffWorkspace SET updatedAt=NOW(3) WHERE id=${workspaceId} AND organizationId=${organizationId}`);
  });
}
