import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { createEstimateAuditSnapshot, type CostLineInput, type CostLineType } from "./cost-engine";
import type { CommercialActor } from "./commercial-access";
import { requireCommercialWriteAccess } from "./commercial-access";
import { getTakeoffWorkspace } from "./takeoff-repository";

function decimalNumber(value: Prisma.Decimal | null) {
  return value == null ? null : Number(value.toString());
}

export async function pushTakeoffBomToEstimate(
  actor: CommercialActor,
  organizationIdInput: string,
  workspaceId: string,
) {
  const organizationId = requireCommercialWriteAccess(actor, organizationIdInput.trim());
  const workspace = await getTakeoffWorkspace(actor, workspaceId, organizationId);
  if (!workspace) throw new Error("Takeoff workspace not found");
  if (!workspace.estimateId) throw new Error("Link an Estimate before pushing the BOM");
  if (workspace.bomItems.length === 0) throw new Error("Add at least one BOM item before pushing to Estimate");

  const estimateRows = await prisma.$queryRaw<Array<{
    id: string;
    markupPercent: Prisma.Decimal;
    taxPercent: Prisma.Decimal;
    laborBurdenPercent: Prisma.Decimal;
    contingencyPercent: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
  }>>(Prisma.sql`
    SELECT id,markupPercent,taxPercent,laborBurdenPercent,contingencyPercent,discountAmount
    FROM Estimate WHERE id=${workspace.estimateId} AND organizationId=${organizationId} LIMIT 1
  `);
  const estimate = estimateRows[0];
  if (!estimate) throw new Error("Linked Estimate does not belong to this organization");

  const pricedRows = await prisma.$queryRaw<Array<{
    id: string;
    description: string;
    unit: string;
    generatedQuantity: Prisma.Decimal;
    overrideQuantity: Prisma.Decimal | null;
    lineType: string;
    unitCostOverride: Prisma.Decimal | null;
  }>>(Prisma.sql`
    SELECT id,description,unit,generatedQuantity,overrideQuantity,lineType,unitCostOverride
    FROM TakeoffBomItem WHERE takeoffWorkspaceId=${workspaceId} AND organizationId=${organizationId}
    ORDER BY createdAt ASC
  `);

  const unresolved = pricedRows.filter((row) => row.unitCostOverride == null);
  if (unresolved.length > 0) {
    throw new Error(`Set a unit cost for every BOM item before pushing to Estimate (${unresolved.length} unresolved)`);
  }

  const lines: CostLineInput[] = pricedRows.map((row) => ({
    type: row.lineType as CostLineType,
    description: row.description,
    quantity: decimalNumber(row.overrideQuantity) ?? Number(row.generatedQuantity.toString()),
    unitCost: Number(row.unitCostOverride!.toString()),
    unit: row.unit,
    taxable: row.lineType === "MATERIAL" || row.lineType === "EQUIPMENT" || row.lineType === "CONSUMABLE",
  }));

  const input = {
    lines,
    markupPercent: Number(estimate.markupPercent.toString()),
    taxPercent: Number(estimate.taxPercent.toString()),
    laborBurdenPercent: Number(estimate.laborBurdenPercent.toString()),
    contingencyPercent: Number(estimate.contingencyPercent.toString()),
    discountAmount: Number(estimate.discountAmount.toString()),
  };
  const audit = createEstimateAuditSnapshot(input);
  const snapshot = {
    workspaceId,
    estimateId: estimate.id,
    workspaceName: workspace.name,
    sourceBidWorkspaceId: workspace.bidWorkspaceId,
    items: pricedRows.map((row, index) => ({ ...lines[index], bomItemId: row.id })),
    estimateAudit: audit,
  };
  const snapshotJson = JSON.stringify(snapshot);
  const snapshotHash = createHash("sha256").update(snapshotJson).digest("hex");
  const versionRows = await prisma.$queryRaw<Array<{ nextVersion: bigint }>>(Prisma.sql`
    SELECT COALESCE(MAX(version),0)+1 AS nextVersion FROM TakeoffEstimateSnapshot
    WHERE takeoffWorkspaceId=${workspaceId} AND organizationId=${organizationId}
  `);
  const version = Number(versionRows[0]?.nextVersion ?? BigInt(1));

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM EstimateLine WHERE estimateId=${estimate.id} AND organizationId=${organizationId}
      AND sourceTakeoffWorkspaceId=${workspaceId}
    `);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const bom = pricedRows[index];
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO EstimateLine (id,organizationId,estimateId,position,type,description,quantity,unit,unitCost,unitPrice,taxable,sourceTakeoffWorkspaceId,sourceTakeoffBomItemId,createdAt,updatedAt)
        VALUES (${randomUUID()},${organizationId},${estimate.id},${index},${line.type},${line.description},${line.quantity},${line.unit ?? null},${line.unitCost},NULL,${line.taxable ?? false},${workspaceId},${bom.id},NOW(3),NOW(3))
      `);
    }
    await tx.$executeRaw(Prisma.sql`
      UPDATE Estimate SET directCost=${audit.totals.directCost},sellSubtotal=${audit.totals.sellSubtotal},taxAmount=${audit.totals.taxAmount},total=${audit.totals.total},grossProfit=${audit.totals.grossProfit},marginPercent=${audit.totals.marginPercent},calculationSnapshot=${snapshotJson},updatedAt=NOW(3)
      WHERE id=${estimate.id} AND organizationId=${organizationId}
    `);
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO TakeoffEstimateSnapshot (id,organizationId,takeoffWorkspaceId,estimateId,version,snapshot,snapshotHash,createdAt)
      VALUES (${randomUUID()},${organizationId},${workspaceId},${estimate.id},${version},${snapshotJson},${snapshotHash},NOW(3))
    `);
    await tx.$executeRaw(Prisma.sql`
      UPDATE TakeoffWorkspace SET status='PRICED',updatedAt=NOW(3) WHERE id=${workspaceId} AND organizationId=${organizationId}
    `);
  });

  return { estimateId: estimate.id, version, snapshotHash, totals: audit.totals };
}
