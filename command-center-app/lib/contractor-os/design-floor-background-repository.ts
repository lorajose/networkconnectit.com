import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";
import { commercialReadScope } from "./commercial-access";

export type DesignFloorBackground = {
  id: string;
  originalName: string;
  mimeType: string;
  byteSize: bigint;
  sha256: string;
  createdAt: Date;
};

export async function getDesignFloorBackground(
  actor: CommercialActor,
  projectId: string,
  floorId: string,
  requestedOrganizationId?: string,
): Promise<DesignFloorBackground | null> {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  const rows = await prisma.$queryRaw<DesignFloorBackground[]>(Prisma.sql`
    SELECT a.id,a.originalName,a.mimeType,a.byteSize,a.sha256,a.createdAt
    FROM DesignFloor f
    JOIN DesignProject p ON p.id=f.designProjectId AND p.organizationId=f.organizationId
    JOIN DesignAsset a ON a.id=f.backgroundAssetId AND a.organizationId=f.organizationId AND a.designProjectId=f.designProjectId
    WHERE f.id=${floorId}
      AND f.designProjectId=${projectId}
      AND f.organizationId=${scope.organizationId}
      AND a.kind='FLOOR_PLAN'
    LIMIT 1
  `);
  return rows[0] ?? null;
}
