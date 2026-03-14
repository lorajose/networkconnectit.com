"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ManagementFormState } from "@/lib/management/form-state";
import { sanitizeInternalRedirectPath } from "@/lib/navigation-security";
import { getUniqueConstraintFields } from "@/lib/management/prisma-errors";
import {
  getScopedOrganizationWhere,
  getScopedRecordWhere,
  requireInventoryWriteAccess,
  resolveWritableOrganizationId,
  type TenantUser
} from "@/lib/management/tenant";
import { projectFormSchema } from "@/lib/validations/project";

function getProjectFormValues(formData: FormData) {
  return {
    organizationId: formData.get("organizationId"),
    name: formData.get("name"),
    projectCode: formData.get("projectCode"),
    status: formData.get("status"),
    projectType: formData.get("projectType"),
    priority: formData.get("priority"),
    primarySiteId: formData.get("primarySiteId"),
    siteIds: formData.getAll("siteIds"),
    installationDate: formData.get("installationDate"),
    goLiveDate: formData.get("goLiveDate"),
    warrantyStartAt: formData.get("warrantyStartAt"),
    warrantyEndAt: formData.get("warrantyEndAt"),
    clientContactName: formData.get("clientContactName"),
    clientContactEmail: formData.get("clientContactEmail"),
    clientContactPhone: formData.get("clientContactPhone"),
    internalProjectManager: formData.get("internalProjectManager"),
    leadTechnician: formData.get("leadTechnician"),
    salesOwner: formData.get("salesOwner"),
    scopeSummary: formData.get("scopeSummary"),
    remoteAccessMethod: formData.get("remoteAccessMethod"),
    handoffStatus: formData.get("handoffStatus"),
    monitoringReady: formData.get("monitoringReady"),
    vendorSystemsPlanned: formData.get("vendorSystemsPlanned"),
    externalReference: formData.get("externalReference"),
    internalNotes: formData.get("internalNotes"),
    clientFacingNotes: formData.get("clientFacingNotes")
  };
}

function projectValidationError(
  fieldErrors: Record<string, string[] | undefined>,
  message = "Review the highlighted fields and try again."
): ManagementFormState {
  return {
    status: "error",
    message,
    fieldErrors
  };
}

async function validateProjectScope(
  user: TenantUser,
  organizationId: string,
  siteIds: string[]
) {
  const uniqueSiteIds = [...new Set(siteIds)];

  const [organization, sites] = await Promise.all([
    prisma.organization.findFirst({
      where: {
        id: organizationId,
        ...getScopedOrganizationWhere(user)
      },
      select: {
        id: true
      }
    }),
    uniqueSiteIds.length
      ? prisma.site.findMany({
          where: {
            id: {
              in: uniqueSiteIds
            },
            organizationId,
            ...getScopedRecordWhere(user)
          },
          select: {
            id: true
          }
        })
      : Promise.resolve([])
  ]);

  return {
    organization,
    validSiteIds: sites.map((site) => site.id)
  };
}

function revalidateProjectPaths(projectId: string, siteIds: string[] = []) {
  revalidatePath("/dashboard");
  revalidatePath("/viewer");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/sites");
  revalidatePath("/devices");

  for (const siteId of siteIds) {
    revalidatePath(`/sites/${siteId}`);
  }
}

export async function createProjectAction(
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = projectFormSchema.safeParse(getProjectFormValues(formData));

  if (!parsed.success) {
    return projectValidationError(parsed.error.flatten().fieldErrors);
  }

  const organizationId = resolveWritableOrganizationId(
    user,
    parsed.data.organizationId
  );

  if (!organizationId) {
    return projectValidationError(
      {
        organizationId: ["Select an organization."]
      },
      "A valid organization is required."
    );
  }

  const scopeCheck = await validateProjectScope(
    user,
    organizationId,
    parsed.data.siteIds
  );

  if (!scopeCheck.organization) {
    return projectValidationError(
      {
        organizationId: ["You do not have access to this organization."]
      },
      "The selected organization is outside your tenant scope."
    );
  }

  if (scopeCheck.validSiteIds.length !== new Set(parsed.data.siteIds).size) {
    return projectValidationError(
      {
        siteIds: ["Select only sites that belong to the chosen organization."]
      },
      "One or more linked sites are outside the selected tenant."
    );
  }

  if (
    parsed.data.primarySiteId &&
    !scopeCheck.validSiteIds.includes(parsed.data.primarySiteId)
  ) {
    return projectValidationError(
      {
        primarySiteId: ["The primary site must also be linked to this project."]
      },
      "Choose a primary site that is part of the linked-site set."
    );
  }

  try {
    const project = await prisma.$transaction(async (transaction) => {
      const createdProject = await transaction.projectInstallation.create({
        data: {
          organizationId,
          primarySiteId: parsed.data.primarySiteId ?? null,
          name: parsed.data.name,
          projectCode: parsed.data.projectCode ?? null,
          status: parsed.data.status,
          projectType: parsed.data.projectType,
          priority: parsed.data.priority,
          installationDate: parsed.data.installationDate ?? null,
          goLiveDate: parsed.data.goLiveDate ?? null,
          warrantyStartAt: parsed.data.warrantyStartAt ?? null,
          warrantyEndAt: parsed.data.warrantyEndAt ?? null,
          clientContactName: parsed.data.clientContactName ?? null,
          clientContactEmail: parsed.data.clientContactEmail ?? null,
          clientContactPhone: parsed.data.clientContactPhone ?? null,
          internalProjectManager: parsed.data.internalProjectManager ?? null,
          leadTechnician: parsed.data.leadTechnician ?? null,
          salesOwner: parsed.data.salesOwner ?? null,
          scopeSummary: parsed.data.scopeSummary ?? null,
          remoteAccessMethod: parsed.data.remoteAccessMethod ?? null,
          handoffStatus: parsed.data.handoffStatus,
          monitoringReady: parsed.data.monitoringReady,
          vendorSystemsPlanned: parsed.data.vendorSystemsPlanned ?? null,
          externalReference: parsed.data.externalReference ?? null,
          internalNotes: parsed.data.internalNotes ?? null,
          clientFacingNotes: parsed.data.clientFacingNotes ?? null
        }
      });

      if (scopeCheck.validSiteIds.length > 0) {
        await transaction.projectSite.createMany({
          data: scopeCheck.validSiteIds.map((siteId) => ({
            organizationId,
            projectInstallationId: createdProject.id,
            siteId
          }))
        });
      }

      return createdProject;
    });

    revalidateProjectPaths(project.id, scopeCheck.validSiteIds);
    redirect(`/projects/${project.id}`);
  } catch (error) {
    const uniqueFields = getUniqueConstraintFields(error);

    if (
      uniqueFields.includes("organizationId") &&
      uniqueFields.includes("projectCode")
    ) {
      return projectValidationError(
        {
          projectCode: ["This project code is already used in the organization."]
        },
        "Choose a unique project code or leave it blank."
      );
    }

    return {
      status: "error",
      message: "Unable to save the project right now."
    };
  }
}

export async function updateProjectAction(
  projectId: string,
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = projectFormSchema.safeParse(getProjectFormValues(formData));

  if (!parsed.success) {
    return projectValidationError(parsed.error.flatten().fieldErrors);
  }

  const existingProject = await prisma.projectInstallation.findFirst({
    where: {
      id: projectId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true
    }
  });

  if (!existingProject) {
    return {
      status: "error",
      message: "The project could not be found."
    };
  }

  if (parsed.data.organizationId !== existingProject.organizationId) {
    return projectValidationError(
      {
        organizationId: ["Changing the organization on an existing project is not supported."]
      },
      "Project ownership must remain stable for linked sites and devices."
    );
  }

  const scopeCheck = await validateProjectScope(
    user,
    existingProject.organizationId,
    parsed.data.siteIds
  );

  if (scopeCheck.validSiteIds.length !== new Set(parsed.data.siteIds).size) {
    return projectValidationError(
      {
        siteIds: ["Select only sites that belong to the chosen organization."]
      },
      "One or more linked sites are outside the selected tenant."
    );
  }

  if (
    parsed.data.primarySiteId &&
    !scopeCheck.validSiteIds.includes(parsed.data.primarySiteId)
  ) {
    return projectValidationError(
      {
        primarySiteId: ["The primary site must also be linked to this project."]
      },
      "Choose a primary site that is part of the linked-site set."
    );
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.projectInstallation.update({
        where: {
          id: projectId
        },
        data: {
          primarySiteId: parsed.data.primarySiteId ?? null,
          name: parsed.data.name,
          projectCode: parsed.data.projectCode ?? null,
          status: parsed.data.status,
          projectType: parsed.data.projectType,
          priority: parsed.data.priority,
          installationDate: parsed.data.installationDate ?? null,
          goLiveDate: parsed.data.goLiveDate ?? null,
          warrantyStartAt: parsed.data.warrantyStartAt ?? null,
          warrantyEndAt: parsed.data.warrantyEndAt ?? null,
          clientContactName: parsed.data.clientContactName ?? null,
          clientContactEmail: parsed.data.clientContactEmail ?? null,
          clientContactPhone: parsed.data.clientContactPhone ?? null,
          internalProjectManager: parsed.data.internalProjectManager ?? null,
          leadTechnician: parsed.data.leadTechnician ?? null,
          salesOwner: parsed.data.salesOwner ?? null,
          scopeSummary: parsed.data.scopeSummary ?? null,
          remoteAccessMethod: parsed.data.remoteAccessMethod ?? null,
          handoffStatus: parsed.data.handoffStatus,
          monitoringReady: parsed.data.monitoringReady,
          vendorSystemsPlanned: parsed.data.vendorSystemsPlanned ?? null,
          externalReference: parsed.data.externalReference ?? null,
          internalNotes: parsed.data.internalNotes ?? null,
          clientFacingNotes: parsed.data.clientFacingNotes ?? null
        }
      });

      await transaction.projectSite.deleteMany({
        where: {
          projectInstallationId: projectId
        }
      });

      if (scopeCheck.validSiteIds.length > 0) {
        await transaction.projectSite.createMany({
          data: scopeCheck.validSiteIds.map((siteId) => ({
            organizationId: existingProject.organizationId,
            projectInstallationId: projectId,
            siteId
          }))
        });
      }
    });

    revalidateProjectPaths(projectId, scopeCheck.validSiteIds);
    redirect(`/projects/${projectId}`);
  } catch (error) {
    const uniqueFields = getUniqueConstraintFields(error);

    if (
      uniqueFields.includes("organizationId") &&
      uniqueFields.includes("projectCode")
    ) {
      return projectValidationError(
        {
          projectCode: ["This project code is already used in the organization."]
        },
        "Choose a unique project code or leave it blank."
      );
    }

    return {
      status: "error",
      message: "Unable to update the project right now."
    };
  }
}

export async function unlinkProjectSiteAction(
  projectId: string,
  projectSiteId: string,
  redirectPath: string
) {
  const user = requireInventoryWriteAccess(await requireUser());
  const safeRedirectPath = sanitizeInternalRedirectPath(
    redirectPath,
    `/projects/${projectId}`
  );

  const projectSite = await prisma.projectSite.findFirst({
    where: {
      id: projectSiteId,
      projectInstallationId: projectId,
      ...getScopedRecordWhere(user)
    },
    select: {
      siteId: true,
      organizationId: true
    }
  });

  if (!projectSite) {
    redirect(safeRedirectPath);
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.projectSite.delete({
      where: {
        id: projectSiteId
      }
    });

    const project = await transaction.projectInstallation.findUnique({
      where: {
        id: projectId
      },
      select: {
        primarySiteId: true
      }
    });

    if (project?.primarySiteId === projectSite.siteId) {
      await transaction.projectInstallation.update({
        where: {
          id: projectId
        },
        data: {
          primarySiteId: null
        }
      });
    }
  });

  revalidateProjectPaths(projectId, [projectSite.siteId]);
  redirect(safeRedirectPath);
}
