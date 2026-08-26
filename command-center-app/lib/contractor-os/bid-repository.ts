import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";
import { commercialReadScope, requireCommercialWriteAccess } from "./commercial-access";
import {
  normalizeBidDocumentMetadata,
  normalizeBidIntakeMetadata,
  type BidDocumentMetadata,
  type BidIntakeMetadata,
} from "./bid-intake";

export const BID_STATUSES = ["DRAFT", "REVIEW", "READY_TO_ESTIMATE", "SUBMITTED", "WON", "LOST", "ARCHIVED"] as const;
export type BidStatus = (typeof BID_STATUSES)[number];

export type BidWorkspaceSummary = {
  id: string; organizationId: string; projectInstallationId: string | null; estimateId: string | null;
  bidNumber: string; title: string; status: BidStatus; revision: string | null; bidDueAt: Date | null;
  notes: string | null; documentCount: bigint; updatedAt: Date;
};

export type BidDocumentView = {
  id: string; documentType: string; fileName: string; revision: string | null; sourceKey: string;
  sourceMimeType: string | null; sourceSizeBytes: bigint | null; createdAt: Date;
};

export type BidWorkspaceDetail = Omit<BidWorkspaceSummary, "documentCount"> & { documents: BidDocumentView[] };
export type CreateBidWorkspaceInput = BidIntakeMetadata & { organizationId: string; bidNumber: string; projectInstallationId?: string | null; estimateId?: string | null };
export type UpdateBidWorkspaceInput = BidIntakeMetadata & { organizationId: string; bidId: string; status: BidStatus; projectInstallationId?: string | null; estimateId?: string | null };

const MAX_BID_NUMBER_LENGTH = 64;
function normalizeBidNumber(value: string) { const bidNumber = value.trim(); if (!bidNumber) throw new Error("Bid number is required"); if (bidNumber.length > MAX_BID_NUMBER_LENGTH) throw new Error("Bid number is too long"); return bidNumber; }

async function assertOptionalLinkBelongsToTenant(table: "ProjectInstallation" | "Estimate", id: string | null | undefined, organizationId: string) {
  if (!id) return;
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM ${Prisma.raw(table)} WHERE id = ${id} AND organizationId = ${organizationId} LIMIT 1`);
  if (!rows[0]) throw new Error(`${table} does not belong to the selected organization`);
}

export async function listBidWorkspaces(actor: CommercialActor, requestedOrganizationId?: string): Promise<BidWorkspaceSummary[]> {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  return prisma.$queryRaw<BidWorkspaceSummary[]>(Prisma.sql`
    SELECT b.id,b.organizationId,b.projectInstallationId,b.estimateId,b.bidNumber,b.title,b.status,b.revision,b.bidDueAt,b.notes,COUNT(d.id) AS documentCount,b.updatedAt
    FROM BidWorkspace b LEFT JOIN BidDocument d ON d.bidWorkspaceId=b.id AND d.organizationId=b.organizationId
    WHERE b.organizationId=${scope.organizationId}
    GROUP BY b.id ORDER BY CASE WHEN b.bidDueAt IS NULL THEN 1 ELSE 0 END,b.bidDueAt ASC,b.updatedAt DESC`);
}

export async function getBidWorkspace(actor: CommercialActor, bidId: string, requestedOrganizationId?: string): Promise<BidWorkspaceDetail | null> {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  const rows = await prisma.$queryRaw<Array<Omit<BidWorkspaceSummary, "documentCount">>>(Prisma.sql`
    SELECT id,organizationId,projectInstallationId,estimateId,bidNumber,title,status,revision,bidDueAt,notes,updatedAt
    FROM BidWorkspace WHERE id=${bidId} AND organizationId=${scope.organizationId} LIMIT 1`);
  const bid = rows[0]; if (!bid) return null;
  const documents = await prisma.$queryRaw<BidDocumentView[]>(Prisma.sql`
    SELECT id,documentType,fileName,revision,sourceKey,sourceMimeType,sourceSizeBytes,createdAt
    FROM BidDocument WHERE bidWorkspaceId=${bidId} AND organizationId=${scope.organizationId}
    ORDER BY createdAt DESC`);
  return { ...bid, documents };
}

export async function createBidWorkspace(actor: CommercialActor, input: CreateBidWorkspaceInput): Promise<string> {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  const metadata = normalizeBidIntakeMetadata(input); const bidNumber = normalizeBidNumber(input.bidNumber);
  const projectInstallationId = input.projectInstallationId?.trim() || null; const estimateId = input.estimateId?.trim() || null;
  await assertOptionalLinkBelongsToTenant("ProjectInstallation", projectInstallationId, organizationId); await assertOptionalLinkBelongsToTenant("Estimate", estimateId, organizationId);
  const id = randomUUID(); const bidDueAt = metadata.bidDueAt ? new Date(metadata.bidDueAt) : null;
  await prisma.$executeRaw(Prisma.sql`INSERT INTO BidWorkspace (id,organizationId,projectInstallationId,estimateId,bidNumber,title,status,revision,bidDueAt,notes,createdAt,updatedAt)
    VALUES (${id},${organizationId},${projectInstallationId},${estimateId},${bidNumber},${metadata.title},'DRAFT',${metadata.revision ?? null},${bidDueAt},${metadata.notes ?? null},NOW(3),NOW(3))`);
  return id;
}

export async function updateBidWorkspace(actor: CommercialActor, input: UpdateBidWorkspaceInput) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  if (!BID_STATUSES.includes(input.status)) throw new Error("Bid status is invalid");
  const metadata = normalizeBidIntakeMetadata(input); const projectInstallationId = input.projectInstallationId?.trim() || null; const estimateId = input.estimateId?.trim() || null;
  await assertOptionalLinkBelongsToTenant("ProjectInstallation", projectInstallationId, organizationId); await assertOptionalLinkBelongsToTenant("Estimate", estimateId, organizationId);
  const changed = await prisma.$executeRaw(Prisma.sql`UPDATE BidWorkspace SET title=${metadata.title},status=${input.status},revision=${metadata.revision ?? null},bidDueAt=${metadata.bidDueAt ? new Date(metadata.bidDueAt) : null},notes=${metadata.notes ?? null},projectInstallationId=${projectInstallationId},estimateId=${estimateId},updatedAt=NOW(3) WHERE id=${input.bidId} AND organizationId=${organizationId}`);
  if (!changed) throw new Error("Bid workspace not found");
}

export async function addBidDocumentMetadata(actor: CommercialActor, organizationIdInput: string, bidId: string, input: BidDocumentMetadata) {
  const organizationId = requireCommercialWriteAccess(actor, organizationIdInput.trim()); const metadata = normalizeBidDocumentMetadata(input);
  const bid = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM BidWorkspace WHERE id=${bidId} AND organizationId=${organizationId} LIMIT 1`);
  if (!bid[0]) throw new Error("Bid workspace not found");
  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`INSERT INTO BidDocument (id,organizationId,bidWorkspaceId,documentType,fileName,revision,sourceKey,sourceMimeType,sourceSizeBytes,createdAt,updatedAt)
    VALUES (${id},${organizationId},${bidId},${metadata.documentType},${metadata.fileName},${metadata.revision ?? null},${metadata.sourceKey},${metadata.sourceMimeType ?? null},${metadata.sourceSizeBytes ?? null},NOW(3),NOW(3))`);
  return id;
}
