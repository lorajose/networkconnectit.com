import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";
import { requireCommercialWriteAccess } from "./commercial-access";

type EvidenceDocument = {
  id: string;
  documentType: string;
  fileName: string;
  revision: string | null;
  sourceKey: string;
  sourceMimeType: string | null;
  sourceSizeBytes: bigint | null;
  createdAt: Date;
};

type EvidenceSnapshotPayload = {
  bid: {
    id: string;
    bidNumber: string;
    title: string;
    revision: string | null;
    status: string;
  };
  estimate: {
    id: string;
    estimateNumber: string;
    title: string;
    status: string;
  };
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    revision: string | null;
    sourceKey: string;
    sourceMimeType: string | null;
    sourceSizeBytes: string | null;
    createdAt: string;
  }>;
};

export async function snapshotBidEvidenceForEstimate(
  actor: CommercialActor,
  organizationIdInput: string,
  bidWorkspaceId: string,
) {
  const organizationId = requireCommercialWriteAccess(actor, organizationIdInput.trim());

  const bids = await prisma.$queryRaw<Array<{
    id: string;
    estimateId: string | null;
    bidNumber: string;
    title: string;
    revision: string | null;
    status: string;
  }>>(Prisma.sql`
    SELECT id, estimateId, bidNumber, title, revision, status
    FROM BidWorkspace
    WHERE id = ${bidWorkspaceId} AND organizationId = ${organizationId}
    LIMIT 1
  `);
  const bid = bids[0];
  if (!bid) throw new Error("Bid workspace not found");
  if (!bid.estimateId) throw new Error("Link an estimate before creating an evidence snapshot");

  const estimates = await prisma.$queryRaw<Array<{ id: string; estimateNumber: string; title: string; status: string }>>(Prisma.sql`
    SELECT id, estimateNumber, title, status
    FROM Estimate
    WHERE id = ${bid.estimateId} AND organizationId = ${organizationId}
    LIMIT 1
  `);
  const estimate = estimates[0];
  if (!estimate) throw new Error("Linked estimate was not found in this organization");

  const documents = await prisma.$queryRaw<EvidenceDocument[]>(Prisma.sql`
    SELECT id, documentType, fileName, revision, sourceKey, sourceMimeType, sourceSizeBytes, createdAt
    FROM BidDocument
    WHERE bidWorkspaceId = ${bidWorkspaceId} AND organizationId = ${organizationId}
    ORDER BY createdAt ASC, id ASC
  `);

  const payload: EvidenceSnapshotPayload = {
    bid: { id: bid.id, bidNumber: bid.bidNumber, title: bid.title, revision: bid.revision, status: bid.status },
    estimate,
    documents: documents.map((document) => ({
      ...document,
      sourceSizeBytes: document.sourceSizeBytes?.toString() ?? null,
      createdAt: document.createdAt.toISOString(),
    })),
  };

  const canonical = JSON.stringify(payload);
  const snapshotHash = createHash("sha256").update(canonical).digest("hex");

  const versions = await prisma.$queryRaw<Array<{ nextVersion: bigint }>>(Prisma.sql`
    SELECT COALESCE(MAX(version), 0) + 1 AS nextVersion
    FROM EstimateEvidenceSnapshot
    WHERE estimateId = ${estimate.id} AND organizationId = ${organizationId}
  `);
  const version = Number(versions[0]?.nextVersion ?? BigInt(1));
  const id = randomUUID();

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO EstimateEvidenceSnapshot (
      id, organizationId, estimateId, bidWorkspaceId, version, bidRevision,
      evidenceSnapshot, snapshotHash, createdAt
    ) VALUES (
      ${id}, ${organizationId}, ${estimate.id}, ${bidWorkspaceId}, ${version}, ${bid.revision},
      ${canonical}, ${snapshotHash}, NOW(3)
    )
  `);

  await prisma.$executeRaw(Prisma.sql`
    UPDATE BidWorkspace
    SET status = 'READY_TO_ESTIMATE', updatedAt = NOW(3)
    WHERE id = ${bidWorkspaceId} AND organizationId = ${organizationId}
  `);

  return { id, estimateId: estimate.id, version, snapshotHash, documentCount: documents.length };
}
