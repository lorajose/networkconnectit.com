import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";
import { commercialReadScope } from "./commercial-access";
import type { QuantityEvidence, ScopeRiskInput, ScopeStatement } from "./scope-risk-analyzer";

function number(value: Prisma.Decimal | null | undefined) {
  return value == null ? 0 : Number(value.toString());
}

function splitStatements(source: ScopeStatement["source"], sourceId: string, text: string | null | undefined): ScopeStatement[] {
  if (!text?.trim()) return [];
  const rows: ScopeStatement[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^[-*\s]+/, "").trim();
    if (!line) continue;
    const match = line.match(/^(scope|responsibility|assumption|exclusion|alternate|risk)\s*:\s*(.+)$/i);
    if (!match) {
      rows.push({ source, sourceId, kind: "SCOPE", text: line });
      continue;
    }
    const kind = match[1].toUpperCase() as ScopeStatement["kind"];
    const body = match[2].trim();
    if (!body) continue;
    if (kind === "RESPONSIBILITY") {
      const responsibilityMatch = body.match(/^([^:]{1,80})\s*:\s*(.+)$/);
      rows.push({
        source,
        sourceId,
        kind,
        responsibility: responsibilityMatch?.[1]?.trim() || null,
        text: responsibilityMatch?.[2]?.trim() || body,
      });
    } else {
      rows.push({ source, sourceId, kind, text: body });
    }
  }
  return rows;
}

export async function buildScopeRiskInput(
  actor: CommercialActor,
  input: {
    organizationId?: string;
    bidWorkspaceId?: string | null;
    takeoffWorkspaceId?: string | null;
    estimateId?: string | null;
    projectInstallationId?: string | null;
  },
): Promise<ScopeRiskInput> {
  const scope = commercialReadScope(actor, input.organizationId);
  const organizationId = scope.organizationId;
  const quantities: QuantityEvidence[] = [];
  const statements: ScopeStatement[] = [];

  if (input.takeoffWorkspaceId) {
    const rows = await prisma.$queryRaw<Array<{
      id: string;
      itemCode: string | null;
      description: string;
      unit: string;
      countedQuantity: Prisma.Decimal;
      overrideQuantity: Prisma.Decimal | null;
      sheetReference: string | null;
      notes: string | null;
    }>>(Prisma.sql`
      SELECT id,itemCode,description,unit,countedQuantity,overrideQuantity,sheetReference,notes
      FROM TakeoffItem
      WHERE takeoffWorkspaceId=${input.takeoffWorkspaceId} AND organizationId=${organizationId}
      ORDER BY createdAt ASC
    `);
    for (const row of rows) {
      quantities.push({
        source: "TAKEOFF",
        sourceId: row.id,
        key: row.itemCode || row.description,
        description: row.description,
        quantity: row.overrideQuantity == null ? number(row.countedQuantity) : number(row.overrideQuantity),
        unit: row.unit,
        sheetReference: row.sheetReference,
      });
      statements.push(...splitStatements("TAKEOFF", row.id, row.notes));
    }
  }

  if (input.estimateId) {
    const rows = await prisma.$queryRaw<Array<{
      id: string;
      description: string;
      quantity: Prisma.Decimal;
      unit: string | null;
      sourceTakeoffBomItemId: string | null;
    }>>(Prisma.sql`
      SELECT id,description,quantity,unit,sourceTakeoffBomItemId
      FROM EstimateLine
      WHERE estimateId=${input.estimateId} AND organizationId=${organizationId}
      ORDER BY position ASC,createdAt ASC
    `);
    for (const row of rows) {
      quantities.push({
        source: "ESTIMATE",
        sourceId: row.id,
        key: row.sourceTakeoffBomItemId || row.description,
        description: row.description,
        quantity: number(row.quantity),
        unit: row.unit,
      });
    }
  }

  if (input.bidWorkspaceId) {
    const rows = await prisma.$queryRaw<Array<{ id: string; notes: string | null }>>(Prisma.sql`
      SELECT id,notes FROM BidWorkspace
      WHERE id=${input.bidWorkspaceId} AND organizationId=${organizationId} LIMIT 1
    `);
    if (!rows[0]) throw new Error("Bid workspace not found for selected organization");
    statements.push(...splitStatements("BID", rows[0].id, rows[0].notes));
  }

  if (input.projectInstallationId) {
    const rows = await prisma.$queryRaw<Array<{
      id: string;
      scopeSummary: string | null;
      internalNotes: string | null;
      clientFacingNotes: string | null;
    }>>(Prisma.sql`
      SELECT id,scopeSummary,internalNotes,clientFacingNotes FROM ProjectInstallation
      WHERE id=${input.projectInstallationId} AND organizationId=${organizationId} LIMIT 1
    `);
    if (!rows[0]) throw new Error("Project not found for selected organization");
    statements.push(...splitStatements("PROJECT", rows[0].id, rows[0].scopeSummary));
    statements.push(...splitStatements("PROJECT", rows[0].id, rows[0].internalNotes));
    statements.push(...splitStatements("PROJECT", rows[0].id, rows[0].clientFacingNotes));
  }

  return { quantities, statements };
}
