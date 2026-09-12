import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  catalogReadOrganizationId,
  normalizeDeviceRevisionInput,
  requireCatalogWriteScope,
  type CreateDeviceCatalogItemInput,
  type DeviceCatalogActor,
  type DeviceCatalogCategory,
  type DeviceCatalogVisibility,
  type DeviceRevisionInput,
} from "./device-catalog";

export type DeviceCatalogFilters = {
  organizationId?: string | null;
  query?: string | null;
  manufacturer?: string | null;
  category?: DeviceCatalogCategory | null;
  poeRequired?: boolean | null;
  minCameraResolutionMp?: number | null;
};

export type DeviceCatalogListItem = {
  id: string;
  ownerOrganizationId: string | null;
  visibility: DeviceCatalogVisibility;
  manufacturer: string;
  model: string;
  category: DeviceCatalogCategory;
  status: string;
  currentRevisionId: string | null;
  revisionNumber: number | null;
  revisionLabel: string | null;
  maxPowerWatts: number | null;
  poeRequired: boolean | null;
  cameraResolutionMp: number | null;
  lensMinMm: number | null;
  lensMaxMm: number | null;
  horizontalFovDegrees: number | null;
  provenanceSource: string;
  updatedAt: Date;
};

export type DeviceCatalogRevisionView = {
  id: string;
  catalogItemId: string;
  revisionNumber: number;
  revisionLabel: string | null;
  manufacturer: string;
  model: string;
  category: DeviceCatalogCategory;
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
  weightKg: number | null;
  powerInput: string | null;
  maxPowerWatts: number | null;
  poeRequired: boolean | null;
  poeStandard: string | null;
  poeClass: string | null;
  ethernetSpeedMbps: number | null;
  wirelessStandard: string | null;
  networkNotes: string | null;
  cameraResolutionMp: number | null;
  lensMinMm: number | null;
  lensMaxMm: number | null;
  horizontalFovDegrees: number | null;
  verticalFovDegrees: number | null;
  irRangeMeters: number | null;
  sensorSize: string | null;
  videoCodecs: string | null;
  technicalAttributes: unknown;
  provenanceSource: string;
  provenanceUrl: string | null;
  provenanceNotes: string | null;
  effectiveFrom: Date | null;
  createdById: string | null;
  createdAt: Date;
};

function effectiveDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Effective date is invalid");
  return date;
}

function jsonValue(value: Record<string, unknown> | null | undefined) {
  return value == null ? null : JSON.stringify(value);
}

function buildCatalogWhere(actor: DeviceCatalogActor, filters: DeviceCatalogFilters) {
  const organizationId = catalogReadOrganizationId(actor, filters.organizationId);
  const clauses: Prisma.Sql[] = [Prisma.sql`(i.visibility='ENTERPRISE_SHARED' OR i.ownerOrganizationId=${organizationId})`, Prisma.sql`i.status='ACTIVE'`];
  const manufacturer = filters.manufacturer?.trim();
  const query = filters.query?.trim();
  if (manufacturer) clauses.push(Prisma.sql`i.manufacturer=${manufacturer}`);
  if (filters.category) clauses.push(Prisma.sql`i.category=${filters.category}`);
  if (filters.poeRequired != null) clauses.push(Prisma.sql`r.poeRequired=${filters.poeRequired}`);
  if (filters.minCameraResolutionMp != null) clauses.push(Prisma.sql`r.cameraResolutionMp>=${filters.minCameraResolutionMp}`);
  if (query) {
    const like = `%${query}%`;
    clauses.push(Prisma.sql`(i.manufacturer LIKE ${like} OR i.model LIKE ${like} OR r.revisionLabel LIKE ${like})`);
  }
  return Prisma.join(clauses, " AND ");
}

export async function listDeviceCatalog(actor: DeviceCatalogActor, filters: DeviceCatalogFilters = {}): Promise<DeviceCatalogListItem[]> {
  const where = buildCatalogWhere(actor, filters);
  return prisma.$queryRaw<DeviceCatalogListItem[]>(Prisma.sql`
    SELECT i.id,i.ownerOrganizationId,i.visibility,i.manufacturer,i.model,i.category,i.status,i.currentRevisionId,
      r.revisionNumber,r.revisionLabel,r.maxPowerWatts,r.poeRequired,r.cameraResolutionMp,r.lensMinMm,r.lensMaxMm,
      r.horizontalFovDegrees,i.provenanceSource,i.updatedAt
    FROM DeviceCatalogItem i
    LEFT JOIN DeviceCatalogRevision r ON r.id=i.currentRevisionId
    WHERE ${where}
    ORDER BY i.manufacturer ASC,i.model ASC`);
}

export async function getDeviceCatalogRevisions(actor: DeviceCatalogActor, catalogItemId: string, requestedOrganizationId?: string | null) {
  const organizationId = catalogReadOrganizationId(actor, requestedOrganizationId);
  const visible = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id FROM DeviceCatalogItem
    WHERE id=${catalogItemId} AND status='ACTIVE'
      AND (visibility='ENTERPRISE_SHARED' OR ownerOrganizationId=${organizationId})
    LIMIT 1`);
  if (!visible[0]) return [];
  return prisma.$queryRaw<DeviceCatalogRevisionView[]>(Prisma.sql`
    SELECT id,catalogItemId,revisionNumber,revisionLabel,manufacturer,model,category,widthMm,heightMm,depthMm,weightKg,
      powerInput,maxPowerWatts,poeRequired,poeStandard,poeClass,ethernetSpeedMbps,wirelessStandard,networkNotes,
      cameraResolutionMp,lensMinMm,lensMaxMm,horizontalFovDegrees,verticalFovDegrees,irRangeMeters,sensorSize,videoCodecs,
      technicalAttributes,provenanceSource,provenanceUrl,provenanceNotes,effectiveFrom,createdById,createdAt
    FROM DeviceCatalogRevision WHERE catalogItemId=${catalogItemId} ORDER BY revisionNumber DESC`);
}

async function insertRevision(
  tx: Prisma.TransactionClient,
  catalogItemId: string,
  revisionNumber: number,
  actor: DeviceCatalogActor,
  input: DeviceRevisionInput,
) {
  const revision = normalizeDeviceRevisionInput(input);
  const id = randomUUID();
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO DeviceCatalogRevision (
      id,catalogItemId,revisionNumber,revisionLabel,manufacturer,model,category,widthMm,heightMm,depthMm,weightKg,
      powerInput,maxPowerWatts,poeRequired,poeStandard,poeClass,ethernetSpeedMbps,wirelessStandard,networkNotes,
      cameraResolutionMp,lensMinMm,lensMaxMm,horizontalFovDegrees,verticalFovDegrees,irRangeMeters,sensorSize,videoCodecs,
      technicalAttributes,provenanceSource,provenanceUrl,provenanceNotes,effectiveFrom,createdById,createdAt
    ) VALUES (
      ${id},${catalogItemId},${revisionNumber},${revision.revisionLabel ?? null},${revision.manufacturer},${revision.model},${revision.category},
      ${revision.widthMm ?? null},${revision.heightMm ?? null},${revision.depthMm ?? null},${revision.weightKg ?? null},
      ${revision.powerInput ?? null},${revision.maxPowerWatts ?? null},${revision.poeRequired ?? null},${revision.poeStandard ?? null},${revision.poeClass ?? null},
      ${revision.ethernetSpeedMbps ?? null},${revision.wirelessStandard ?? null},${revision.networkNotes ?? null},
      ${revision.cameraResolutionMp ?? null},${revision.lensMinMm ?? null},${revision.lensMaxMm ?? null},${revision.horizontalFovDegrees ?? null},
      ${revision.verticalFovDegrees ?? null},${revision.irRangeMeters ?? null},${revision.sensorSize ?? null},${revision.videoCodecs ?? null},
      ${jsonValue(revision.technicalAttributes)},${revision.provenanceSource},${revision.provenanceUrl ?? null},${revision.provenanceNotes ?? null},
      ${effectiveDate(revision.effectiveFrom)},${actor.userId ?? null},NOW(3)
    )`);
  return { id, revision };
}

export async function createDeviceCatalogItem(actor: DeviceCatalogActor, input: CreateDeviceCatalogItemInput) {
  const ownerOrganizationId = requireCatalogWriteScope(actor, input.visibility, input.organizationId);
  const normalized = normalizeDeviceRevisionInput(input);
  const catalogItemId = randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO DeviceCatalogItem (
        id,ownerOrganizationId,visibility,manufacturer,model,category,status,currentRevisionId,
        provenanceSource,provenanceUrl,provenanceNotes,createdById,createdAt,updatedAt
      ) VALUES (
        ${catalogItemId},${ownerOrganizationId},${input.visibility},${normalized.manufacturer},${normalized.model},${normalized.category},'ACTIVE',NULL,
        ${normalized.provenanceSource},${normalized.provenanceUrl ?? null},${normalized.provenanceNotes ?? null},${actor.userId ?? null},NOW(3),NOW(3)
      )`);
    const created = await insertRevision(tx, catalogItemId, 1, actor, normalized);
    await tx.$executeRaw(Prisma.sql`UPDATE DeviceCatalogItem SET currentRevisionId=${created.id} WHERE id=${catalogItemId}`);
  });

  return catalogItemId;
}

export async function createDeviceCatalogRevision(
  actor: DeviceCatalogActor,
  catalogItemId: string,
  requestedOrganizationId: string | null | undefined,
  input: DeviceRevisionInput,
) {
  return prisma.$transaction(async (tx) => {
    const items = await tx.$queryRaw<Array<{ id: string; visibility: DeviceCatalogVisibility; ownerOrganizationId: string | null; nextRevision: number }>>(Prisma.sql`
      SELECT i.id,i.visibility,i.ownerOrganizationId,COALESCE(MAX(r.revisionNumber),0)+1 AS nextRevision
      FROM DeviceCatalogItem i LEFT JOIN DeviceCatalogRevision r ON r.catalogItemId=i.id
      WHERE i.id=${catalogItemId} AND i.status='ACTIVE'
      GROUP BY i.id,i.visibility,i.ownerOrganizationId
      FOR UPDATE`);
    const item = items[0];
    if (!item) throw new Error("Catalog device not found");
    requireCatalogWriteScope(actor, item.visibility, item.ownerOrganizationId ?? requestedOrganizationId);
    const created = await insertRevision(tx, catalogItemId, Number(item.nextRevision), actor, input);
    await tx.$executeRaw(Prisma.sql`
      UPDATE DeviceCatalogItem SET currentRevisionId=${created.id},manufacturer=${created.revision.manufacturer},model=${created.revision.model},
        category=${created.revision.category},provenanceSource=${created.revision.provenanceSource},provenanceUrl=${created.revision.provenanceUrl ?? null},
        provenanceNotes=${created.revision.provenanceNotes ?? null},updatedAt=NOW(3)
      WHERE id=${catalogItemId}`);
    return created.id;
  });
}

export async function archiveDeviceCatalogItem(actor: DeviceCatalogActor, catalogItemId: string, requestedOrganizationId?: string | null) {
  const rows = await prisma.$queryRaw<Array<{ visibility: DeviceCatalogVisibility; ownerOrganizationId: string | null }>>(Prisma.sql`
    SELECT visibility,ownerOrganizationId FROM DeviceCatalogItem WHERE id=${catalogItemId} AND status='ACTIVE' LIMIT 1`);
  const item = rows[0];
  if (!item) throw new Error("Catalog device not found");
  requireCatalogWriteScope(actor, item.visibility, item.ownerOrganizationId ?? requestedOrganizationId);
  await prisma.$executeRaw(Prisma.sql`UPDATE DeviceCatalogItem SET status='ARCHIVED',updatedAt=NOW(3) WHERE id=${catalogItemId}`);
}
