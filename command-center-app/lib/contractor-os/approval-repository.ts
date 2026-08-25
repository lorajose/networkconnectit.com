import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";
import { requireCommercialWriteAccess } from "./commercial-access";
import type { CommercialDocumentStatus } from "./commercial-workflow";
import { assertProposalCanBeApproved, normalizeApprovalSubmission } from "./approval-policy";

export type PersistProposalApprovalInput = {
  actor: CommercialActor;
  organizationId: string;
  proposalId: string;
  proposalVersion: number;
  signerName: string;
  signerEmail?: string;
  acceptanceText: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type ProposalRow = {
  id: string;
  status: CommercialDocumentStatus;
  currentVersion: number;
};

type ProposalVersionRow = {
  id: string;
  customerTotal: Prisma.Decimal;
};

export async function persistProposalApproval(input: PersistProposalApprovalInput) {
  const organizationId = requireCommercialWriteAccess(input.actor, input.organizationId);
  const proposalId = input.proposalId.trim();
  if (!proposalId) throw new Error("proposalId is required");

  const normalized = normalizeApprovalSubmission(input);

  return prisma.$transaction(async (tx) => {
    const proposals = await tx.$queryRaw<ProposalRow[]>(Prisma.sql`
      SELECT id, status, currentVersion
      FROM Proposal
      WHERE id = ${proposalId} AND organizationId = ${organizationId}
      LIMIT 1
      FOR UPDATE
    `);

    const proposal = proposals[0];
    if (!proposal) throw new Error("Proposal not found for organization");

    assertProposalCanBeApproved(proposal.status, proposal.currentVersion, input.proposalVersion);

    const versions = await tx.$queryRaw<ProposalVersionRow[]>(Prisma.sql`
      SELECT id, customerTotal
      FROM ProposalVersion
      WHERE proposalId = ${proposalId}
        AND organizationId = ${organizationId}
        AND version = ${input.proposalVersion}
      LIMIT 1
    `);

    const version = versions[0];
    if (!version) throw new Error("Proposal version not found for organization");

    const receiptId = `apr_${randomUUID().replaceAll("-", "")}`;
    const approvedAt = new Date();

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO ApprovalReceipt (
        id,
        organizationId,
        proposalId,
        proposalVersionId,
        approvedByName,
        approvedByEmail,
        approvedAmount,
        acceptanceText,
        ipAddress,
        userAgent,
        approvedAt
      ) VALUES (
        ${receiptId},
        ${organizationId},
        ${proposalId},
        ${version.id},
        ${normalized.signerName},
        ${normalized.signerEmail},
        ${version.customerTotal},
        ${normalized.acceptanceText},
        ${input.ipAddress ?? null},
        ${input.userAgent ?? null},
        ${approvedAt}
      )
    `);

    await tx.$executeRaw(Prisma.sql`
      UPDATE Proposal
      SET status = 'APPROVED', approvedAt = ${approvedAt}, updatedAt = ${approvedAt}
      WHERE id = ${proposalId} AND organizationId = ${organizationId}
    `);

    return {
      receiptId,
      proposalId,
      proposalVersion: input.proposalVersion,
      approvedAmount: version.customerTotal.toString(),
      approvedAtIso: approvedAt.toISOString(),
      signerName: normalized.signerName,
      signerEmail: normalized.signerEmail,
    };
  });
}
