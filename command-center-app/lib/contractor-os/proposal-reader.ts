import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { AppRole } from "@/lib/rbac";
import type { ProposalDocument } from "./proposal";

type ProposalReadActor = {
  role: AppRole;
  organizationId?: string | null;
};

type PersistedProposalRow = {
  id: string;
  organizationId: string;
  proposalNumber: string;
  title: string;
  status: string;
  currentVersion: number;
  expiresAt: Date | null;
  versionId: string;
  version: number;
  customerSubtotal: Prisma.Decimal;
  customerTax: Prisma.Decimal;
  customerTotal: Prisma.Decimal;
  documentSnapshot: Prisma.JsonValue;
};

export type PersistedProposalView = {
  organizationId: string;
  proposalId: string;
  proposalVersionId: string;
  proposalVersion: number;
  status: string;
  document: ProposalDocument;
};

const globalRoles = new Set<AppRole>(["SUPER_ADMIN", "INTERNAL_ADMIN"]);

function parseDocumentSnapshot(snapshot: Prisma.JsonValue): ProposalDocument {
  const value = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Persisted proposal snapshot is invalid");
  }

  const document = value as unknown as ProposalDocument;
  if (!document.proposalNumber || !document.title || !document.customer?.companyName) {
    throw new Error("Persisted proposal snapshot is incomplete");
  }

  return document;
}

export async function loadLatestPersistedProposal(actor: ProposalReadActor): Promise<PersistedProposalView | null> {
  const tenantOrganizationId = actor.organizationId ?? null;

  if (!globalRoles.has(actor.role) && !tenantOrganizationId) {
    throw new Error("Tenant-scoped proposal reader is missing organizationId");
  }

  const tenantClause = tenantOrganizationId
    ? Prisma.sql`AND p.organizationId = ${tenantOrganizationId}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<PersistedProposalRow[]>(Prisma.sql`
    SELECT
      p.id,
      p.organizationId,
      p.proposalNumber,
      p.title,
      p.status,
      p.currentVersion,
      p.expiresAt,
      pv.id AS versionId,
      pv.version,
      pv.customerSubtotal,
      pv.customerTax,
      pv.customerTotal,
      pv.documentSnapshot
    FROM Proposal p
    INNER JOIN ProposalVersion pv
      ON pv.proposalId = p.id
      AND pv.organizationId = p.organizationId
      AND pv.version = p.currentVersion
    WHERE 1 = 1
      ${tenantClause}
    ORDER BY p.updatedAt DESC
    LIMIT 1
  `);

  const row = rows[0];
  if (!row) return null;

  const document = parseDocumentSnapshot(row.documentSnapshot);

  return {
    organizationId: row.organizationId,
    proposalId: row.id,
    proposalVersionId: row.versionId,
    proposalVersion: row.version,
    status: row.status,
    document: {
      ...document,
      proposalNumber: row.proposalNumber,
      title: row.title,
      customerSubtotal: Number(row.customerSubtotal),
      customerTax: Number(row.customerTax),
      customerTotal: Number(row.customerTotal),
      validUntilIso: row.expiresAt?.toISOString() ?? document.validUntilIso,
    },
  };
}
