import { prisma } from "@/lib/db";

import type { ProjectPassProduct } from "./project-pass";

export type ProjectPassPremiumOutputManifest = {
  schemaVersion: 1;
  product: ProjectPassProduct;
  project: {
    id: string;
    organizationId: string;
    name: string;
    projectCode: string | null;
    status: string;
    primarySite: {
      id: string;
      name: string;
      code: string | null;
      addressLine1: string | null;
      city: string | null;
      stateRegion: string | null;
      postalCode: string | null;
    } | null;
  };
  devices: Array<{
    id: string;
    name: string;
    type: string;
    brand: string | null;
    model: string | null;
    hostname: string | null;
    ipAddress: string | null;
    status: string;
  }>;
  generatedAt: string;
};

/**
 * Builds the canonical server-owned input for paid project artifacts.
 *
 * The caller must complete Project Pass authorization first. The query repeats
 * the organization/project binding so a stale or incorrectly reused access
 * object cannot read another tenant's project data.
 */
export async function buildProjectPassPremiumOutputManifest(input: {
  organizationId: string;
  projectInstallationId: string;
  product: ProjectPassProduct;
  generatedAt?: Date;
}): Promise<ProjectPassPremiumOutputManifest> {
  const project = await prisma.projectInstallation.findFirst({
    where: {
      id: input.projectInstallationId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
      organizationId: true,
      name: true,
      projectCode: true,
      status: true,
      primarySite: {
        select: {
          id: true,
          name: true,
          code: true,
          addressLine1: true,
          city: true,
          stateRegion: true,
          postalCode: true,
        },
      },
      devices: {
        orderBy: [{ type: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          type: true,
          brand: true,
          model: true,
          hostname: true,
          ipAddress: true,
          status: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error("Authorized Project Pass project could not be loaded");
  }

  return {
    schemaVersion: 1,
    product: input.product,
    project: {
      id: project.id,
      organizationId: project.organizationId,
      name: project.name,
      projectCode: project.projectCode,
      status: project.status,
      primarySite: project.primarySite,
    },
    devices: project.devices,
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
  };
}
