import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";
import { requireCommercialWriteAccess } from "./commercial-access";

export const DESIGN_SCALE_UNITS = ["FT", "M"] as const;
export type DesignScaleUnit = (typeof DESIGN_SCALE_UNITS)[number];

function parseScaleUnit(value: string): DesignScaleUnit {
  const normalized = value.trim().toUpperCase();
  if (!DESIGN_SCALE_UNITS.includes(normalized as DesignScaleUnit)) {
    throw new Error("Scale unit must be feet or meters");
  }
  return normalized as DesignScaleUnit;
}

export async function updateDesignFloorScale(
  actor: CommercialActor,
  input: {
    organizationId: string;
    projectId: string;
    floorId: string;
    referenceDesignUnits: number;
    referenceRealUnits: number;
    scaleUnit: string;
    confirmScaleChange: boolean;
  },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  if (!Number.isFinite(input.referenceDesignUnits) || input.referenceDesignUnits <= 0) {
    throw new Error("Reference design length must be greater than zero");
  }
  if (!Number.isFinite(input.referenceRealUnits) || input.referenceRealUnits <= 0) {
    throw new Error("Reference real-world length must be greater than zero");
  }

  const scaleUnit = parseScaleUnit(input.scaleUnit);
  const realUnitsPerDesignUnit = input.referenceRealUnits / input.referenceDesignUnits;
  if (!Number.isFinite(realUnitsPerDesignUnit) || realUnitsPerDesignUnit <= 0) {
    throw new Error("Calculated design scale is invalid");
  }

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ realUnitsPerDesignUnit: Prisma.Decimal | null; scaleUnit: string }>>(Prisma.sql`
      SELECT f.realUnitsPerDesignUnit,f.scaleUnit
      FROM DesignFloor f
      JOIN DesignProject p ON p.id=f.designProjectId AND p.organizationId=f.organizationId
      WHERE f.id=${input.floorId}
        AND f.designProjectId=${input.projectId}
        AND f.organizationId=${organizationId}
      FOR UPDATE
    `);
    const floor = rows[0];
    if (!floor) throw new Error("Design floor not found");

    if (floor.realUnitsPerDesignUnit !== null && !input.confirmScaleChange) {
      throw new Error("Confirm the scale change before replacing an existing calibrated scale");
    }

    await tx.$executeRaw(Prisma.sql`
      UPDATE DesignFloor
      SET realUnitsPerDesignUnit=${realUnitsPerDesignUnit},scaleUnit=${scaleUnit},updatedAt=NOW(3)
      WHERE id=${input.floorId}
        AND designProjectId=${input.projectId}
        AND organizationId=${organizationId}
    `);
    await tx.$executeRaw(Prisma.sql`
      UPDATE DesignProject
      SET workingRevision=workingRevision+1,updatedAt=NOW(3)
      WHERE id=${input.projectId} AND organizationId=${organizationId}
    `);

    return { realUnitsPerDesignUnit, scaleUnit };
  });
}
