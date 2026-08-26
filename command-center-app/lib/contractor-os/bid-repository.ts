import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";
import { commercialReadScope, requireCommercialWriteAccess } from "./commercial-access";
import { normalizeBidIntakeMetadata, type BidIntakeMetadata } from "./bid-intake";

export const BID_STATUSES = [
  "DRAFT",
  "REVIEW",
  "READY_TO_ESTIMATE",
  "SUBMITTED",
  "WON",
  "LOST",
  "ARCHIVED",
] as const;

export type BidStatus = (typeof BID_STATUSES)[number];

export type BidWorkspaceSummary = {
  id: string;
  organizationId: string;
  projectInstallationId: string | null;
  estimateId: string | null;
  bidNumber: string;
  title: string;
  status: BidStatus;
  revision: string | null;
  bidDueAt: Date | null;
  notes: string | null;
  documentCount: bigint;
  updatedAt: Date;
};

export type CreateBidWorkspaceInput = BidIntakeMetadata & {
  organizationId: string;
  bidNumber: string;
  projectInstallationId?: string | null;
  estimateId?: string | null;
};

const MAX_BID_NUMBER_LENGTH = 64;

function normalizeBidNumber(value: string) {
  const bidNumber = value.trim();
  if (!bidNumber) throw new Error("Bid number is required");
  if (bidNumber.length > MAX_BID_NUMBER_LENGTH) throw new Error("Bid number is too long");
  return bidNumber;
}

async function assertOptionalLinkBelongsToTenant(
  table: "ProjectInstallation" | "Estimate",
  id: string | null | undefined,
  organizationId: string,
) {
  if (!id) return;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id
    FROM ${Prisma.raw(table)}
    WHERE id = ${id}
      AND organizationId = ${organizationId}
    LIMIT 1
  `);

  if (!rows[0]) {
    throw new Error(`${table} does not belong to the selected organization`);
  }
}

export async function listBidWorkspaces(
  actor: CommercialActor,
  requestedOrganizationId?: string,
): Promise<BidWorkspaceSummary[]> {
  const scope = commercialReadScope(actor, requestedOrganizationId);

  return prisma.$queryRaw<BidWorkspaceSummary[]>(Prisma.sql`
    SELECT
      b.id,
      b.organizationId,
      b.projectInstallationId,
      b.estimateId,
      b.bidNumber,
      b.title,
      b.status,
      b.revision,
      b.bidDueAt,
      b.notes,
      COUNT(d.id) AS documentCount,
      b.updatedAt
    FROM BidWorkspace b
    LEFT JOIN BidDocument d
      ON d.bidWorkspaceId = b.id
      AND d.organizationId = b.organizationId
    WHERE b.organizationId = ${scope.organizationId}
    GROUP BY b.id
    ORDER BY
      CASE WHEN b.bidDueAt IS NULL THEN 1 ELSE 0 END,
      b.bidDueAt ASC,
      b.updatedAt DESC
  `);
}

export async function createBidWorkspace(
  actor: CommercialActor,
  input: CreateBidWorkspaceInput,
): Promise<string> {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  const metadata = normalizeBidIntakeMetadata(input);
  const bidNumber = normalizeBidNumber(input.bidNumber);
  const projectInstallationId = input.projectInstallationId?.trim() || null;
  const estimateId = input.estimateId?.trim() || null;

  await assertOptionalLinkBelongsToTenant("ProjectInstallation", projectInstallationId, organizationId);
  await assertOptionalLinkBelongsToTenant("Estimate", estimateId, organizationId);

  const id = randomUUID();
  const bidDueAt = metadata.bidDueAt ? new Date(metadata.bidDueAt) : null;

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO BidWorkspace (
      id,
      organizationId,
      projectInstallationId,
      estimateId,
      bidNumber,
      title,
      status,
      revision,
      bidDueAt,
      notes,
      createdAt,
      updatedAt
    ) VALUES (
      ${id},
      ${organizationId},
      ${projectInstallationId},
      ${estimateId},
      ${bidNumber},
      ${metadata.title},
      'DRAFT',
      ${metadata.revision ?? null},
      ${bidDueAt},
      ${metadata.notes ?? null},
      NOW(3),
      NOW(3)
    )
  `);

  return id;
}
