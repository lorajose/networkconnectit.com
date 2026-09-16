import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";
import { requireCommercialWriteAccess } from "./commercial-access";
import type { ApprovedDesignTakeoffHandoff } from "./design-takeoff-handoff";
import { createEditableBomInput, normalizeTakeoffItem } from "./takeoff";

/**
 * Applies a human-approved Design Studio proposal to the existing NCI-043
 * Takeoff/BOM tables in one transaction. Manual Takeoff rows are preserved.
 * Previous rows from this same design proposal are replaced idempotently.
 */
export async function applyApprovedDesignTakeoff(
  actor: CommercialActor,
  input: {
    organizationId: string;
    workspaceId: string;
    handoff: ApprovedDesignTakeoffHandoff;
  },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  const workspaceRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id FROM TakeoffWorkspace
    WHERE id=${input.workspaceId} AND organizationId=${organizationId}
    LIMIT 1
  `);
  if (!workspaceRows[0]) throw new Error("Takeoff workspace not found");
  if (!input.handoff.approvedBy.trim()) throw new Error("Approved Design Takeoff requires reviewer identity");
  if (!input.handoff.approvedAt.trim()) throw new Error("Approved Design Takeoff requires review timestamp");

  const proposalMarker = `Design proposal ${input.handoff.proposalId};`;
  const normalized = input.handoff.items.map((item) => normalizeTakeoffItem(item));

  await prisma.$transaction(async (tx) => {
    const previousRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM TakeoffItem
      WHERE takeoffWorkspaceId=${input.workspaceId}
        AND organizationId=${organizationId}
        AND source='AI_SUGGESTED'
        AND notes LIKE ${`${proposalMarker}%`}
    `);

    for (const previous of previousRows) {
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM TakeoffBomItem
        WHERE takeoffItemId=${previous.id}
          AND takeoffWorkspaceId=${input.workspaceId}
          AND organizationId=${organizationId}
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM TakeoffItem
        WHERE id=${previous.id}
          AND takeoffWorkspaceId=${input.workspaceId}
          AND organizationId=${organizationId}
      `);
    }

    for (const item of normalized) {
      const itemId = randomUUID();
      const bomId = randomUUID();
      const bom = createEditableBomInput(item);
      const reviewNote = `${item.notes ?? proposalMarker}; approved by ${input.handoff.approvedBy} at ${input.handoff.approvedAt}`;

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO TakeoffItem
          (id,organizationId,takeoffWorkspaceId,category,itemCode,description,unit,countedQuantity,overrideQuantity,sheetReference,drawingRevision,notes,source,createdAt,updatedAt)
        VALUES
          (${itemId},${organizationId},${input.workspaceId},${item.category},${item.itemCode ?? null},${item.description},${item.unit},${item.countedQuantity},${item.overrideQuantity ?? null},${item.sheetReference ?? null},${item.drawingRevision ?? null},${reviewNote},'AI_SUGGESTED',NOW(3),NOW(3))
      `);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO TakeoffBomItem
          (id,organizationId,takeoffWorkspaceId,takeoffItemId,catalogCode,description,unit,generatedQuantity,overrideQuantity,costRuleKey,notes,createdAt,updatedAt)
        VALUES
          (${bomId},${organizationId},${input.workspaceId},${itemId},${bom.catalogCode},${bom.description},${bom.unit},${bom.generatedQuantity},NULL,${bom.costRuleKey},${reviewNote},NOW(3),NOW(3))
      `);
    }

    await tx.$executeRaw(Prisma.sql`
      UPDATE TakeoffWorkspace SET updatedAt=NOW(3)
      WHERE id=${input.workspaceId} AND organizationId=${organizationId}
    `);
  });

  return {
    workspaceId: input.workspaceId,
    proposalId: input.handoff.proposalId,
    appliedItems: normalized.length,
    approvedBy: input.handoff.approvedBy,
    approvedAt: input.handoff.approvedAt,
  };
}
