import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { CostLineType } from "./cost-engine";
import type { CommercialActor } from "./commercial-access";
import { commercialReadScope, requireCommercialWriteAccess } from "./commercial-access";

const LINE_TYPES: CostLineType[] = ["MATERIAL", "LABOR", "EQUIPMENT", "TRAVEL", "CONSUMABLE", "OTHER"];

export type BomPricingView = {
  id: string;
  lineType: CostLineType;
  unitCostOverride: Prisma.Decimal | null;
};

export async function listBomPricing(
  actor: CommercialActor,
  workspaceId: string,
  requestedOrganizationId?: string,
) {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  return prisma.$queryRaw<BomPricingView[]>(Prisma.sql`
    SELECT id,lineType,unitCostOverride FROM TakeoffBomItem
    WHERE takeoffWorkspaceId=${workspaceId} AND organizationId=${scope.organizationId}
  `);
}

export async function updateBomPricing(
  actor: CommercialActor,
  input: {
    organizationId: string;
    workspaceId: string;
    bomItemId: string;
    lineType: CostLineType;
    unitCostOverride: number | null;
  },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  if (!LINE_TYPES.includes(input.lineType)) throw new Error("Estimate line type is invalid");
  if (input.unitCostOverride != null && (!Number.isFinite(input.unitCostOverride) || input.unitCostOverride < 0)) {
    throw new Error("Unit cost must be zero or greater");
  }
  const changed = await prisma.$executeRaw(Prisma.sql`
    UPDATE TakeoffBomItem SET lineType=${input.lineType},unitCostOverride=${input.unitCostOverride},updatedAt=NOW(3)
    WHERE id=${input.bomItemId} AND takeoffWorkspaceId=${input.workspaceId} AND organizationId=${organizationId}
  `);
  if (!changed) throw new Error("BOM item not found");
}
