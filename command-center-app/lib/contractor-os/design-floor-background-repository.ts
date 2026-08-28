import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";
import { commercialReadScope, requireCommercialWriteAccess } from "./commercial-access";

export type DesignFloorBackground = {
  id: string;
  originalName: string;
  mimeType: string;
  byteSize: bigint;
  sha256: string;
  createdAt: Date;
  backgroundOpacity: Prisma.Decimal;
  backgroundVisible: boolean;
  backgroundLocked: boolean;
  backgroundPdfPage: number;
};

type DesignFloorBackgroundAsset = DesignFloorBackground & { storageKey: string };

export async function getDesignFloorBackground(
  actor: CommercialActor,
  projectId: string,
  floorId: string,
  requestedOrganizationId?: string,
): Promise<DesignFloorBackground | null> {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  const rows = await prisma.$queryRaw<DesignFloorBackground[]>(Prisma.sql`
    SELECT a.id,a.originalName,a.mimeType,a.byteSize,a.sha256,a.createdAt,
      f.backgroundOpacity,f.backgroundVisible,f.backgroundLocked,f.backgroundPdfPage
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

export async function getDesignFloorBackgroundAsset(
  actor: CommercialActor,
  projectId: string,
  floorId: string,
  requestedOrganizationId?: string,
): Promise<DesignFloorBackgroundAsset | null> {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  const rows = await prisma.$queryRaw<DesignFloorBackgroundAsset[]>(Prisma.sql`
    SELECT a.id,a.originalName,a.mimeType,a.byteSize,a.sha256,a.createdAt,a.storageKey,
      f.backgroundOpacity,f.backgroundVisible,f.backgroundLocked,f.backgroundPdfPage
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

export async function updateDesignFloorBackgroundSettings(
  actor: CommercialActor,
  input: {
    organizationId: string;
    projectId: string;
    floorId: string;
    opacity: number;
    visible: boolean;
    locked: boolean;
  },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  if (!Number.isFinite(input.opacity) || input.opacity < 0.1 || input.opacity > 1) {
    throw new Error("Background opacity must be between 10% and 100%");
  }

  const changed = await prisma.$executeRaw(Prisma.sql`
    UPDATE DesignFloor f
    JOIN DesignProject p ON p.id=f.designProjectId AND p.organizationId=f.organizationId
    SET f.backgroundOpacity=${input.opacity},
        f.backgroundVisible=${input.visible},
        f.backgroundLocked=${input.locked},
        f.updatedAt=NOW(3)
    WHERE f.id=${input.floorId}
      AND f.designProjectId=${input.projectId}
      AND f.organizationId=${organizationId}
      AND f.backgroundAssetId IS NOT NULL
  `);
  if (!changed) throw new Error("Design floor background not found");
}

export async function updateDesignFloorPdfPage(
  actor: CommercialActor,
  input: {
    organizationId: string;
    projectId: string;
    floorId: string;
    page: number;
  },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  if (!Number.isInteger(input.page) || input.page < 1 || input.page > 10000) {
    throw new Error("PDF page must be a positive whole number");
  }

  const changed = await prisma.$executeRaw(Prisma.sql`
    UPDATE DesignFloor f
    JOIN DesignProject p ON p.id=f.designProjectId AND p.organizationId=f.organizationId
    JOIN DesignAsset a ON a.id=f.backgroundAssetId AND a.organizationId=f.organizationId AND a.designProjectId=f.designProjectId
    SET f.backgroundPdfPage=${input.page},f.updatedAt=NOW(3)
    WHERE f.id=${input.floorId}
      AND f.designProjectId=${input.projectId}
      AND f.organizationId=${organizationId}
      AND a.kind='FLOOR_PLAN'
      AND a.mimeType='application/pdf'
  `);
  if (!changed) throw new Error("PDF floor plan background not found");
}
