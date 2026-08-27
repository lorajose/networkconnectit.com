import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";
import { commercialReadScope, requireCommercialWriteAccess } from "./commercial-access";
import { analyzeScopeRisk, type ScopeRiskFinding, type ScopeRiskInput } from "./scope-risk-analyzer";

export type ScopeRiskFindingStatus = "OPEN" | "ACCEPTED" | "DISMISSED";
export type ScopeRiskDecision = "ACCEPTED" | "DISMISSED";

export type ScopeRiskFindingView = {
  id: string;
  analysisRunId: string;
  stableKey: string;
  findingType: string;
  severity: string;
  title: string;
  detail: string;
  sourceRefs: string;
  proposalSection: string | null;
  status: ScopeRiskFindingStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type ScopeRiskAnalysisRunView = {
  id: string;
  organizationId: string;
  bidWorkspaceId: string | null;
  takeoffWorkspaceId: string | null;
  estimateId: string | null;
  projectInstallationId: string | null;
  status: string;
  inputHash: string;
  createdAt: Date;
};

function stableSnapshot(input: ScopeRiskInput) {
  return JSON.stringify({
    quantities: [...input.quantities].sort((a, b) => `${a.source}:${a.sourceId}:${a.key}`.localeCompare(`${b.source}:${b.sourceId}:${b.key}`)),
    statements: [...input.statements].sort((a, b) => `${a.source}:${a.sourceId}:${a.kind}:${a.text}`.localeCompare(`${b.source}:${b.sourceId}:${b.kind}:${b.text}`)),
    quantityTolerance: input.quantityTolerance ?? 0.001,
  });
}

async function assertOptionalLink(table: "BidWorkspace" | "TakeoffWorkspace" | "Estimate" | "ProjectInstallation", id: string | null | undefined, organizationId: string) {
  if (!id) return;
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id FROM ${Prisma.raw(table)} WHERE id=${id} AND organizationId=${organizationId} LIMIT 1
  `);
  if (!rows[0]) throw new Error(`${table} does not belong to the selected organization`);
}

export async function createScopeRiskAnalysisRun(
  actor: CommercialActor,
  input: {
    organizationId: string;
    bidWorkspaceId?: string | null;
    takeoffWorkspaceId?: string | null;
    estimateId?: string | null;
    projectInstallationId?: string | null;
    analysis: ScopeRiskInput;
  },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  await Promise.all([
    assertOptionalLink("BidWorkspace", input.bidWorkspaceId, organizationId),
    assertOptionalLink("TakeoffWorkspace", input.takeoffWorkspaceId, organizationId),
    assertOptionalLink("Estimate", input.estimateId, organizationId),
    assertOptionalLink("ProjectInstallation", input.projectInstallationId, organizationId),
  ]);

  const snapshot = stableSnapshot(input.analysis);
  const inputHash = createHash("sha256").update(snapshot).digest("hex");
  const findings = analyzeScopeRisk(input.analysis);
  const runId = randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO ScopeRiskAnalysisRun
        (id,organizationId,bidWorkspaceId,takeoffWorkspaceId,estimateId,projectInstallationId,status,inputSnapshot,inputHash,createdAt)
      VALUES
        (${runId},${organizationId},${input.bidWorkspaceId ?? null},${input.takeoffWorkspaceId ?? null},${input.estimateId ?? null},${input.projectInstallationId ?? null},'COMPLETE',${snapshot},${inputHash},NOW(3))
    `);

    for (const finding of findings) {
      await insertFinding(tx, organizationId, runId, finding);
    }
  });

  return { runId, inputHash, findingCount: findings.length };
}

async function insertFinding(tx: Prisma.TransactionClient, organizationId: string, runId: string, finding: ScopeRiskFinding) {
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO ScopeRiskFinding
      (id,organizationId,analysisRunId,stableKey,findingType,severity,title,detail,sourceRefs,proposalSection,status,createdAt,updatedAt)
    VALUES
      (${randomUUID()},${organizationId},${runId},${finding.stableKey},${finding.type},${finding.severity},${finding.title},${finding.detail},${JSON.stringify(finding.sourceRefs)},${finding.proposalSection},'OPEN',NOW(3),NOW(3))
  `);
}

export async function listScopeRiskRuns(actor: CommercialActor, requestedOrganizationId?: string) {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  return prisma.$queryRaw<ScopeRiskAnalysisRunView[]>(Prisma.sql`
    SELECT id,organizationId,bidWorkspaceId,takeoffWorkspaceId,estimateId,projectInstallationId,status,inputHash,createdAt
    FROM ScopeRiskAnalysisRun
    WHERE organizationId=${scope.organizationId}
    ORDER BY createdAt DESC
  `);
}

export async function getScopeRiskRun(actor: CommercialActor, runId: string, requestedOrganizationId?: string) {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  const runs = await prisma.$queryRaw<ScopeRiskAnalysisRunView[]>(Prisma.sql`
    SELECT id,organizationId,bidWorkspaceId,takeoffWorkspaceId,estimateId,projectInstallationId,status,inputHash,createdAt
    FROM ScopeRiskAnalysisRun
    WHERE id=${runId} AND organizationId=${scope.organizationId}
    LIMIT 1
  `);
  if (!runs[0]) return null;

  const findings = await prisma.$queryRaw<ScopeRiskFindingView[]>(Prisma.sql`
    SELECT id,analysisRunId,stableKey,findingType,severity,title,detail,sourceRefs,proposalSection,status,createdAt,updatedAt
    FROM ScopeRiskFinding
    WHERE analysisRunId=${runId} AND organizationId=${scope.organizationId}
    ORDER BY FIELD(severity,'CRITICAL','HIGH','MEDIUM','LOW','INFO'), createdAt ASC
  `);
  return { run: runs[0], findings };
}

export async function decideScopeRiskFinding(
  actor: CommercialActor & { userId?: string | null },
  input: { organizationId: string; findingId: string; decision: ScopeRiskDecision; note?: string | null },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  if (!actor.userId) throw new Error("Authenticated user id is required for audit decisions");
  if (input.decision !== "ACCEPTED" && input.decision !== "DISMISSED") throw new Error("Invalid finding decision");

  const findings = await prisma.$queryRaw<Array<{ id: string; status: string }>>(Prisma.sql`
    SELECT id,status FROM ScopeRiskFinding WHERE id=${input.findingId} AND organizationId=${organizationId} LIMIT 1
  `);
  if (!findings[0]) throw new Error("Scope risk finding not found");

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO ScopeRiskFindingDecision (id,organizationId,findingId,decision,decidedByUserId,note,createdAt)
      VALUES (${randomUUID()},${organizationId},${input.findingId},${input.decision},${actor.userId},${input.note?.trim() || null},NOW(3))
    `);
    await tx.$executeRaw(Prisma.sql`
      UPDATE ScopeRiskFinding SET status=${input.decision},updatedAt=NOW(3)
      WHERE id=${input.findingId} AND organizationId=${organizationId}
    `);
  });
}

export async function listAcceptedProposalFindings(actor: CommercialActor, requestedOrganizationId: string, analysisRunId: string) {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  return prisma.$queryRaw<Array<Pick<ScopeRiskFindingView, "id" | "findingType" | "title" | "detail" | "proposalSection">>>(Prisma.sql`
    SELECT id,findingType,title,detail,proposalSection
    FROM ScopeRiskFinding
    WHERE organizationId=${scope.organizationId}
      AND analysisRunId=${analysisRunId}
      AND status='ACCEPTED'
      AND proposalSection IS NOT NULL
    ORDER BY proposalSection,title
  `);
}
