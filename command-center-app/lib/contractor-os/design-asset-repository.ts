import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";
import { requireCommercialWriteAccess } from "./commercial-access";
import type { ValidatedDesignFloorPlan } from "./design-floor-plan";

export async function persistFloorPlanAssetAndAttach(
  actor: CommercialActor,
  input: {
    organizationId: string;
    projectId: string;
    floorId: string;
    storageKey: string;
    asset: ValidatedDesignFloorPlan;
    createdByUserId: string;
  },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());

  await prisma.$transaction(async (tx) => {
    const projectRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM DesignProject WHERE id=${input.projectId} AND organizationId=${organizationId} FOR UPDATE
    `);
    if (!projectRows[0]) throw new Error("Design project not found");

    const floorRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM DesignFloor
      WHERE id=${input.floorId} AND designProjectId=${input.projectId} AND organizationId=${organizationId}
      LIMIT 1
    `);
    if (!floorRows[0]) throw new Error("Design floor not found");

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO DesignAsset (id,organizationId,designProjectId,kind,originalName,mimeType,storageKey,byteSize,sha256,createdByUserId,createdAt)
      VALUES (${input.asset.assetId},${organizationId},${input.projectId},'FLOOR_PLAN',${input.asset.originalName},${input.asset.mimeType},${input.storageKey},${input.asset.byteSize},${input.asset.sha256},${input.createdByUserId},NOW(3))
    `);

    await tx.$executeRaw(Prisma.sql`
      UPDATE DesignFloor SET backgroundAssetId=${input.asset.assetId},updatedAt=NOW(3)
      WHERE id=${input.floorId} AND designProjectId=${input.projectId} AND organizationId=${organizationId}
    `);
  });

  return input.asset.assetId;
}
