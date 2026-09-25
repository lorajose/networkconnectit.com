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
  estimateId: string;
  projectInstallationId: string | null;
  status: CommercialDocumentStatus;
  currentVersion: number;
};

type EstimateProjectRow = {
  id: string;
  projectInstallationId: string | null;
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
      SELECT id, estimateId, projectInstallationId, status, currentVersion
      FROM Proposal
      WHERE id = ${proposalId} AND organizationId = ${organizationId}
      LIMIT 1
      FOR UPDATE
    `);

    const proposal = proposals[0];
    if (!proposal) throw new Error("Proposal not found for organization");

    assertProposalCanBeApproved(proposal.status, proposal.currentVersion, input.proposalVersion);

    const estimates = await tx.$queryRaw<EstimateProjectRow[]>(Prisma.sql`
      SELECT id, projectInstallationId
      FROM Estimate
      WHERE id = ${proposal.estimateId} AND organizationId = ${organizationId}
      LIMIT 1
      FOR UPDATE
    `);
    const estimate = estimates[0];
    if (!estimate) throw new Error("Proposal estimate not found for organization");

    if (proposal.projectInstallationId && estimate.projectInstallationId && proposal.projectInstallationId !== estimate.projectInstallationId) {
      throw new Error("Proposal and Estimate project links do not match");
    }
    const projectInstallationId = proposal.projectInstallationId ?? estimate.projectInstallationId;
    if (!projectInstallationId) throw new Error("Link the Estimate or Proposal to a ProjectInstallation before approval");

    const projects = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM ProjectInstallation
      WHERE id = ${projectInstallationId} AND organizationId = ${organizationId}
      LIMIT 1
    `);
    if (!projects[0]) throw new Error("Linked ProjectInstallation not found for organization");

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
      SET status = 'APPROVED', projectInstallationId = ${projectInstallationId}, approvedAt = ${approvedAt}, updatedAt = ${approvedAt}
      WHERE id = ${proposalId} AND organizationId = ${organizationId}
    `);

    await tx.$executeRaw(Prisma.sql`
      UPDATE Estimate
      SET status = 'ACCEPTED', projectInstallationId = ${projectInstallationId}, updatedAt = ${approvedAt}
      WHERE id = ${estimate.id} AND organizationId = ${organizationId}
    `);

    return {
      receiptId,
      proposalId,
      proposalVersion: input.proposalVersion,
      projectInstallationId,
      approvedAmount: version.customerTotal.toString(),
      approvedAtIso: approvedAt.toISOString(),
      signerName: normalized.signerName,
      signerEmail: normalized.signerEmail,
    };
  });
}
