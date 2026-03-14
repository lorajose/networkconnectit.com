"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DeviceType } from "@prisma/client";

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
import { accessReferenceFormSchema } from "@/lib/validations/access-reference";
import { deviceLinkFormSchema } from "@/lib/validations/device-link";
import { networkSegmentFormSchema } from "@/lib/validations/network-segment";
import { nvrChannelAssignmentFormSchema } from "@/lib/validations/nvr-channel-assignment";

function infrastructureValidationError(
  fieldErrors: Record<string, string[] | undefined>,
  message = "Review the highlighted fields and try again."
): ManagementFormState {
  return {
    status: "error",
    message,
    fieldErrors
  };
}

function getAccessReferenceFormValues(formData: FormData) {
  return {
    organizationId: formData.get("organizationId"),
    siteId: formData.get("siteId"),
    projectInstallationId: formData.get("projectInstallationId"),
    deviceId: formData.get("deviceId"),
    name: formData.get("name"),
    accessType: formData.get("accessType"),
    vaultProvider: formData.get("vaultProvider"),
    vaultPath: formData.get("vaultPath"),
    owner: formData.get("owner"),
    remoteAccessMethod: formData.get("remoteAccessMethod"),
    notes: formData.get("notes"),
    lastValidatedAt: formData.get("lastValidatedAt")
  };
}

function getNetworkSegmentFormValues(formData: FormData) {
  return {
    organizationId: formData.get("organizationId"),
    siteId: formData.get("siteId"),
    name: formData.get("name"),
    vlanId: formData.get("vlanId"),
    subnetCidr: formData.get("subnetCidr"),
    gatewayIp: formData.get("gatewayIp"),
    purpose: formData.get("purpose"),
    notes: formData.get("notes")
  };
}

function getNvrChannelAssignmentFormValues(formData: FormData) {
  return {
    organizationId: formData.get("organizationId"),
    siteId: formData.get("siteId"),
    nvrDeviceId: formData.get("nvrDeviceId"),
    cameraDeviceId: formData.get("cameraDeviceId"),
    channelNumber: formData.get("channelNumber"),
    recordingEnabled: formData.get("recordingEnabled"),
    notes: formData.get("notes")
  };
}

function getDeviceLinkFormValues(formData: FormData) {
  return {
    organizationId: formData.get("organizationId"),
    siteId: formData.get("siteId"),
    sourceDeviceId: formData.get("sourceDeviceId"),
    targetDeviceId: formData.get("targetDeviceId"),
    linkType: formData.get("linkType"),
    sourcePort: formData.get("sourcePort"),
    targetPort: formData.get("targetPort"),
    poeProvided: formData.get("poeProvided"),
    notes: formData.get("notes")
  };
}

function revalidateInfrastructurePaths({
  redirectPath,
  siteId,
  deviceId,
  projectId
}: {
  redirectPath: string;
  siteId?: string | null;
  deviceId?: string | null;
  projectId?: string | null;
}) {
  const safeRedirectPath = sanitizeInternalRedirectPath(redirectPath);

  revalidatePath("/dashboard");
  revalidatePath("/viewer");
  revalidatePath("/projects");
  revalidatePath("/sites");
  revalidatePath("/devices");
  revalidatePath(safeRedirectPath);

  if (siteId) {
    revalidatePath(`/sites/${siteId}`);
  }

  if (deviceId) {
    revalidatePath(`/devices/${deviceId}`);
  }

  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }
}

function resolveInfrastructureRedirectPath(
  redirectPath: string,
  {
    projectId,
    siteId,
    deviceId
  }: {
    projectId?: string | null;
    siteId?: string | null;
    deviceId?: string | null;
  }
) {
  const fallback =
    projectId
      ? `/projects/${projectId}`
      : siteId
        ? `/sites/${siteId}`
        : deviceId
          ? `/devices/${deviceId}`
          : "/dashboard";

  return sanitizeInternalRedirectPath(redirectPath, fallback);
}

async function validateAccessReferenceScope(
  user: TenantUser,
  organizationId: string,
  {
    siteId,
    projectInstallationId,
    deviceId
  }: {
    siteId?: string | null;
    projectInstallationId?: string | null;
    deviceId?: string | null;
  }
) {
  const [organization, site, projectInstallation, device] = await Promise.all([
    prisma.organization.findFirst({
      where: {
        id: organizationId,
        ...getScopedOrganizationWhere(user)
      },
      select: {
        id: true
      }
    }),
    siteId
      ? prisma.site.findFirst({
          where: {
            id: siteId,
            organizationId,
            ...getScopedRecordWhere(user)
          },
          select: {
            id: true
          }
        })
      : Promise.resolve(null),
    projectInstallationId
      ? prisma.projectInstallation.findFirst({
          where: {
            id: projectInstallationId,
            organizationId,
            ...getScopedRecordWhere(user)
          },
          select: {
            id: true
          }
        })
      : Promise.resolve(null),
    deviceId
      ? prisma.device.findFirst({
          where: {
            id: deviceId,
            organizationId,
            ...getScopedRecordWhere(user)
          },
          select: {
            id: true,
            siteId: true
          }
        })
      : Promise.resolve(null)
  ]);

  return {
    organization,
    site,
    projectInstallation,
    device
  };
}

async function validateSiteScope(
  user: TenantUser,
  organizationId: string,
  siteId: string
) {
  const [organization, site] = await Promise.all([
    prisma.organization.findFirst({
      where: {
        id: organizationId,
        ...getScopedOrganizationWhere(user)
      },
      select: {
        id: true
      }
    }),
    prisma.site.findFirst({
      where: {
        id: siteId,
        organizationId,
        ...getScopedRecordWhere(user)
      },
      select: {
        id: true
      }
    })
  ]);

  return {
    organization,
    site
  };
}

async function validateAssignmentScope(
  user: TenantUser,
  organizationId: string,
  siteId: string,
  nvrDeviceId: string,
  cameraDeviceId: string
) {
  const [organization, site, nvrDevice, cameraDevice] = await Promise.all([
    prisma.organization.findFirst({
      where: {
        id: organizationId,
        ...getScopedOrganizationWhere(user)
      },
      select: {
        id: true
      }
    }),
    prisma.site.findFirst({
      where: {
        id: siteId,
        organizationId,
        ...getScopedRecordWhere(user)
      },
      select: {
        id: true
      }
    }),
    prisma.device.findFirst({
      where: {
        id: nvrDeviceId,
        organizationId,
        siteId,
        ...getScopedRecordWhere(user)
      },
      select: {
        id: true,
        type: true
      }
    }),
    prisma.device.findFirst({
      where: {
        id: cameraDeviceId,
        organizationId,
        siteId,
        ...getScopedRecordWhere(user)
      },
      select: {
        id: true,
        type: true
      }
    })
  ]);

  return {
    organization,
    site,
    nvrDevice,
    cameraDevice
  };
}

async function validateLinkScope(
  user: TenantUser,
  organizationId: string,
  siteId: string,
  sourceDeviceId: string,
  targetDeviceId: string
) {
  const [organization, site, sourceDevice, targetDevice] = await Promise.all([
    prisma.organization.findFirst({
      where: {
        id: organizationId,
        ...getScopedOrganizationWhere(user)
      },
      select: {
        id: true
      }
    }),
    prisma.site.findFirst({
      where: {
        id: siteId,
        organizationId,
        ...getScopedRecordWhere(user)
      },
      select: {
        id: true
      }
    }),
    prisma.device.findFirst({
      where: {
        id: sourceDeviceId,
        organizationId,
        siteId,
        ...getScopedRecordWhere(user)
      },
      select: {
        id: true
      }
    }),
    prisma.device.findFirst({
      where: {
        id: targetDeviceId,
        organizationId,
        siteId,
        ...getScopedRecordWhere(user)
      },
      select: {
        id: true
      }
    })
  ]);

  return {
    organization,
    site,
    sourceDevice,
    targetDevice
  };
}

export async function createAccessReferenceAction(
  redirectPath: string,
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = accessReferenceFormSchema.safeParse(
    getAccessReferenceFormValues(formData)
  );

  if (!parsed.success) {
    return infrastructureValidationError(parsed.error.flatten().fieldErrors);
  }

  const organizationId = resolveWritableOrganizationId(
    user,
    parsed.data.organizationId
  );

  if (!organizationId) {
    return infrastructureValidationError(
      {
        organizationId: ["Select an organization."]
      },
      "A valid organization is required."
    );
  }

  const scopeCheck = await validateAccessReferenceScope(user, organizationId, {
    siteId: parsed.data.siteId ?? null,
    projectInstallationId: parsed.data.projectInstallationId ?? null,
    deviceId: parsed.data.deviceId ?? null
  });

  if (!scopeCheck.organization) {
    return infrastructureValidationError(
      {
        organizationId: ["You do not have access to this organization."]
      },
      "The selected organization is outside your tenant scope."
    );
  }

  if (parsed.data.siteId && !scopeCheck.site) {
    return infrastructureValidationError(
      {
        siteId: ["Select a site within the chosen organization."]
      },
      "The selected site is outside your tenant scope."
    );
  }

  if (parsed.data.projectInstallationId && !scopeCheck.projectInstallation) {
    return infrastructureValidationError(
      {
        projectInstallationId: ["Select a project within the chosen organization."]
      },
      "The selected project is outside your tenant scope."
    );
  }

  if (parsed.data.deviceId && !scopeCheck.device) {
    return infrastructureValidationError(
      {
        deviceId: ["Select a device within the chosen organization."]
      },
      "The selected device is outside your tenant scope."
    );
  }

  if (
    parsed.data.siteId &&
    parsed.data.deviceId &&
    scopeCheck.device?.siteId !== parsed.data.siteId
  ) {
    return infrastructureValidationError(
      {
        deviceId: ["The selected device does not belong to the chosen site."]
      },
      "Access references must stay aligned with the site scope."
    );
  }

  const safeRedirectPath = resolveInfrastructureRedirectPath(redirectPath, {
    projectId: parsed.data.projectInstallationId ?? null,
    siteId: parsed.data.siteId ?? scopeCheck.device?.siteId ?? null,
    deviceId: parsed.data.deviceId ?? null
  });

  await prisma.accessReference.create({
    data: {
      organizationId,
      siteId: parsed.data.siteId ?? null,
      projectInstallationId: parsed.data.projectInstallationId ?? null,
      deviceId: parsed.data.deviceId ?? null,
      name: parsed.data.name,
      accessType: parsed.data.accessType,
      vaultProvider: parsed.data.vaultProvider ?? null,
      vaultPath: parsed.data.vaultPath ?? null,
      owner: parsed.data.owner ?? null,
      remoteAccessMethod: parsed.data.remoteAccessMethod ?? null,
      notes: parsed.data.notes ?? null,
      lastValidatedAt: parsed.data.lastValidatedAt ?? null
    }
  });

  revalidateInfrastructurePaths({
    redirectPath: safeRedirectPath,
    siteId: parsed.data.siteId ?? scopeCheck.device?.siteId,
    deviceId: parsed.data.deviceId ?? null,
    projectId: parsed.data.projectInstallationId ?? null
  });

  redirect(safeRedirectPath);
}

export async function updateAccessReferenceAction(
  accessReferenceId: string,
  redirectPath: string,
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = accessReferenceFormSchema.safeParse(
    getAccessReferenceFormValues(formData)
  );

  if (!parsed.success) {
    return infrastructureValidationError(parsed.error.flatten().fieldErrors);
  }

  const existingReference = await prisma.accessReference.findFirst({
    where: {
      id: accessReferenceId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true
    }
  });

  if (!existingReference) {
    return {
      status: "error",
      message: "The access reference could not be found."
    };
  }

  const scopeCheck = await validateAccessReferenceScope(
    user,
    existingReference.organizationId,
    {
      siteId: parsed.data.siteId ?? null,
      projectInstallationId: parsed.data.projectInstallationId ?? null,
      deviceId: parsed.data.deviceId ?? null
    }
  );

  if (parsed.data.siteId && !scopeCheck.site) {
    return infrastructureValidationError(
      {
        siteId: ["Select a site within the chosen organization."]
      },
      "The selected site is outside your tenant scope."
    );
  }

  if (parsed.data.projectInstallationId && !scopeCheck.projectInstallation) {
    return infrastructureValidationError(
      {
        projectInstallationId: ["Select a project within the chosen organization."]
      },
      "The selected project is outside your tenant scope."
    );
  }

  if (parsed.data.deviceId && !scopeCheck.device) {
    return infrastructureValidationError(
      {
        deviceId: ["Select a device within the chosen organization."]
      },
      "The selected device is outside your tenant scope."
    );
  }

  if (
    parsed.data.siteId &&
    parsed.data.deviceId &&
    scopeCheck.device?.siteId !== parsed.data.siteId
  ) {
    return infrastructureValidationError(
      {
        deviceId: ["The selected device does not belong to the chosen site."]
      },
      "Access references must stay aligned with the site scope."
    );
  }

  const safeRedirectPath = resolveInfrastructureRedirectPath(redirectPath, {
    projectId: parsed.data.projectInstallationId ?? null,
    siteId: parsed.data.siteId ?? scopeCheck.device?.siteId ?? null,
    deviceId: parsed.data.deviceId ?? null
  });

  await prisma.accessReference.update({
    where: {
      id: accessReferenceId
    },
    data: {
      siteId: parsed.data.siteId ?? null,
      projectInstallationId: parsed.data.projectInstallationId ?? null,
      deviceId: parsed.data.deviceId ?? null,
      name: parsed.data.name,
      accessType: parsed.data.accessType,
      vaultProvider: parsed.data.vaultProvider ?? null,
      vaultPath: parsed.data.vaultPath ?? null,
      owner: parsed.data.owner ?? null,
      remoteAccessMethod: parsed.data.remoteAccessMethod ?? null,
      notes: parsed.data.notes ?? null,
      lastValidatedAt: parsed.data.lastValidatedAt ?? null
    }
  });

  revalidateInfrastructurePaths({
    redirectPath: safeRedirectPath,
    siteId: parsed.data.siteId ?? scopeCheck.device?.siteId,
    deviceId: parsed.data.deviceId ?? null,
    projectId: parsed.data.projectInstallationId ?? null
  });

  redirect(safeRedirectPath);
}

export async function createNetworkSegmentAction(
  redirectPath: string,
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = networkSegmentFormSchema.safeParse(
    getNetworkSegmentFormValues(formData)
  );

  if (!parsed.success) {
    return infrastructureValidationError(parsed.error.flatten().fieldErrors);
  }

  const organizationId = resolveWritableOrganizationId(
    user,
    parsed.data.organizationId
  );

  if (!organizationId) {
    return infrastructureValidationError(
      {
        organizationId: ["Select an organization."]
      },
      "A valid organization is required."
    );
  }

  const scopeCheck = await validateSiteScope(
    user,
    organizationId,
    parsed.data.siteId
  );

  if (!scopeCheck.organization || !scopeCheck.site) {
    return infrastructureValidationError(
      {
        siteId: ["Select a site within the chosen organization."]
      },
      "The selected site is outside your tenant scope."
    );
  }

  const safeRedirectPath = resolveInfrastructureRedirectPath(redirectPath, {
    siteId: parsed.data.siteId
  });

  try {
    await prisma.networkSegment.create({
      data: {
        organizationId,
        siteId: parsed.data.siteId,
        name: parsed.data.name,
        vlanId: parsed.data.vlanId ?? null,
        subnetCidr: parsed.data.subnetCidr,
        gatewayIp: parsed.data.gatewayIp ?? null,
        purpose: parsed.data.purpose ?? null,
        notes: parsed.data.notes ?? null
      }
    });
  } catch (error) {
    const uniqueFields = getUniqueConstraintFields(error);

    if (uniqueFields.includes("siteId") && uniqueFields.includes("name")) {
      return infrastructureValidationError(
        {
          name: ["A segment with this name already exists at the site."]
        },
        "Use a unique segment name for this site."
      );
    }

    if (uniqueFields.includes("siteId") && uniqueFields.includes("vlanId")) {
      return infrastructureValidationError(
        {
          vlanId: ["This VLAN already exists at the site."]
        },
        "Use a unique VLAN ID for this site."
      );
    }

    return {
      status: "error",
      message: "Unable to save the network segment right now."
    };
  }

  revalidateInfrastructurePaths({
    redirectPath: safeRedirectPath,
    siteId: parsed.data.siteId
  });

  redirect(safeRedirectPath);
}

export async function updateNetworkSegmentAction(
  networkSegmentId: string,
  redirectPath: string,
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = networkSegmentFormSchema.safeParse(
    getNetworkSegmentFormValues(formData)
  );

  if (!parsed.success) {
    return infrastructureValidationError(parsed.error.flatten().fieldErrors);
  }

  const existingSegment = await prisma.networkSegment.findFirst({
    where: {
      id: networkSegmentId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true,
      siteId: true
    }
  });

  if (!existingSegment) {
    return {
      status: "error",
      message: "The network segment could not be found."
    };
  }

  if (
    parsed.data.organizationId !== existingSegment.organizationId ||
    parsed.data.siteId !== existingSegment.siteId
  ) {
    return infrastructureValidationError(
      {
        siteId: ["Changing the organization or site on an existing segment is not supported."]
      },
      "Segment ownership must remain stable for linked devices."
    );
  }

  const safeRedirectPath = resolveInfrastructureRedirectPath(redirectPath, {
    siteId: existingSegment.siteId
  });

  try {
    await prisma.networkSegment.update({
      where: {
        id: networkSegmentId
      },
      data: {
        name: parsed.data.name,
        vlanId: parsed.data.vlanId ?? null,
        subnetCidr: parsed.data.subnetCidr,
        gatewayIp: parsed.data.gatewayIp ?? null,
        purpose: parsed.data.purpose ?? null,
        notes: parsed.data.notes ?? null
      }
    });
  } catch (error) {
    const uniqueFields = getUniqueConstraintFields(error);

    if (uniqueFields.includes("siteId") && uniqueFields.includes("name")) {
      return infrastructureValidationError(
        {
          name: ["A segment with this name already exists at the site."]
        },
        "Use a unique segment name for this site."
      );
    }

    if (uniqueFields.includes("siteId") && uniqueFields.includes("vlanId")) {
      return infrastructureValidationError(
        {
          vlanId: ["This VLAN already exists at the site."]
        },
        "Use a unique VLAN ID for this site."
      );
    }

    return {
      status: "error",
      message: "Unable to update the network segment right now."
    };
  }

  revalidateInfrastructurePaths({
    redirectPath: safeRedirectPath,
    siteId: existingSegment.siteId
  });

  redirect(safeRedirectPath);
}

export async function createNvrChannelAssignmentAction(
  redirectPath: string,
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = nvrChannelAssignmentFormSchema.safeParse(
    getNvrChannelAssignmentFormValues(formData)
  );

  if (!parsed.success) {
    return infrastructureValidationError(parsed.error.flatten().fieldErrors);
  }

  const organizationId = resolveWritableOrganizationId(
    user,
    parsed.data.organizationId
  );

  if (!organizationId) {
    return infrastructureValidationError(
      {
        organizationId: ["Select an organization."]
      },
      "A valid organization is required."
    );
  }

  const scopeCheck = await validateAssignmentScope(
    user,
    organizationId,
    parsed.data.siteId,
    parsed.data.nvrDeviceId,
    parsed.data.cameraDeviceId
  );

  if (!scopeCheck.organization || !scopeCheck.site) {
    return infrastructureValidationError(
      {
        siteId: ["Select a site within the chosen organization."]
      },
      "The selected site is outside your tenant scope."
    );
  }

  if (!scopeCheck.nvrDevice || scopeCheck.nvrDevice.type !== DeviceType.NVR) {
    return infrastructureValidationError(
      {
        nvrDeviceId: ["Select an NVR device at this site."]
      },
      "The selected recorder must be an NVR."
    );
  }

  if (
    !scopeCheck.cameraDevice ||
    scopeCheck.cameraDevice.type !== DeviceType.CAMERA
  ) {
    return infrastructureValidationError(
      {
        cameraDeviceId: ["Select a camera device at this site."]
      },
      "The selected camera must be a camera device."
    );
  }

  const safeRedirectPath = resolveInfrastructureRedirectPath(redirectPath, {
    siteId: parsed.data.siteId,
    deviceId: parsed.data.nvrDeviceId
  });

  try {
    await prisma.nvrChannelAssignment.create({
      data: {
        organizationId,
        siteId: parsed.data.siteId,
        nvrDeviceId: parsed.data.nvrDeviceId,
        cameraDeviceId: parsed.data.cameraDeviceId,
        channelNumber: parsed.data.channelNumber,
        recordingEnabled: parsed.data.recordingEnabled,
        notes: parsed.data.notes ?? null
      }
    });
  } catch (error) {
    const uniqueFields = getUniqueConstraintFields(error);

    if (uniqueFields.includes("nvrDeviceId") && uniqueFields.includes("channelNumber")) {
      return infrastructureValidationError(
        {
          channelNumber: ["This recorder channel is already assigned."]
        },
        "Choose an unused channel number for the NVR."
      );
    }

    if (uniqueFields.includes("cameraDeviceId")) {
      return infrastructureValidationError(
        {
          cameraDeviceId: ["This camera is already mapped to an NVR channel."]
        },
        "A camera can only be assigned to one active channel."
      );
    }

    return {
      status: "error",
      message: "Unable to save the NVR channel assignment right now."
    };
  }

  revalidateInfrastructurePaths({
    redirectPath: safeRedirectPath,
    siteId: parsed.data.siteId,
    deviceId: parsed.data.nvrDeviceId
  });

  revalidatePath(`/devices/${parsed.data.cameraDeviceId}`);
  redirect(safeRedirectPath);
}

export async function updateNvrChannelAssignmentAction(
  assignmentId: string,
  redirectPath: string,
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = nvrChannelAssignmentFormSchema.safeParse(
    getNvrChannelAssignmentFormValues(formData)
  );

  if (!parsed.success) {
    return infrastructureValidationError(parsed.error.flatten().fieldErrors);
  }

  const existingAssignment = await prisma.nvrChannelAssignment.findFirst({
    where: {
      id: assignmentId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true
    }
  });

  if (!existingAssignment) {
    return {
      status: "error",
      message: "The channel assignment could not be found."
    };
  }

  const scopeCheck = await validateAssignmentScope(
    user,
    existingAssignment.organizationId,
    parsed.data.siteId,
    parsed.data.nvrDeviceId,
    parsed.data.cameraDeviceId
  );

  if (!scopeCheck.nvrDevice || scopeCheck.nvrDevice.type !== DeviceType.NVR) {
    return infrastructureValidationError(
      {
        nvrDeviceId: ["Select an NVR device at this site."]
      },
      "The selected recorder must be an NVR."
    );
  }

  if (
    !scopeCheck.cameraDevice ||
    scopeCheck.cameraDevice.type !== DeviceType.CAMERA
  ) {
    return infrastructureValidationError(
      {
        cameraDeviceId: ["Select a camera device at this site."]
      },
      "The selected camera must be a camera device."
    );
  }

  const safeRedirectPath = resolveInfrastructureRedirectPath(redirectPath, {
    siteId: parsed.data.siteId,
    deviceId: parsed.data.nvrDeviceId
  });

  try {
    await prisma.nvrChannelAssignment.update({
      where: {
        id: assignmentId
      },
      data: {
        siteId: parsed.data.siteId,
        nvrDeviceId: parsed.data.nvrDeviceId,
        cameraDeviceId: parsed.data.cameraDeviceId,
        channelNumber: parsed.data.channelNumber,
        recordingEnabled: parsed.data.recordingEnabled,
        notes: parsed.data.notes ?? null
      }
    });
  } catch (error) {
    const uniqueFields = getUniqueConstraintFields(error);

    if (uniqueFields.includes("nvrDeviceId") && uniqueFields.includes("channelNumber")) {
      return infrastructureValidationError(
        {
          channelNumber: ["This recorder channel is already assigned."]
        },
        "Choose an unused channel number for the NVR."
      );
    }

    if (uniqueFields.includes("cameraDeviceId")) {
      return infrastructureValidationError(
        {
          cameraDeviceId: ["This camera is already mapped to an NVR channel."]
        },
        "A camera can only be assigned to one active channel."
      );
    }

    return {
      status: "error",
      message: "Unable to update the NVR channel assignment right now."
    };
  }

  revalidateInfrastructurePaths({
    redirectPath: safeRedirectPath,
    siteId: parsed.data.siteId,
    deviceId: parsed.data.nvrDeviceId
  });

  revalidatePath(`/devices/${parsed.data.cameraDeviceId}`);
  redirect(safeRedirectPath);
}

export async function createDeviceLinkAction(
  redirectPath: string,
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = deviceLinkFormSchema.safeParse(getDeviceLinkFormValues(formData));

  if (!parsed.success) {
    return infrastructureValidationError(parsed.error.flatten().fieldErrors);
  }

  const organizationId = resolveWritableOrganizationId(
    user,
    parsed.data.organizationId
  );

  if (!organizationId) {
    return infrastructureValidationError(
      {
        organizationId: ["Select an organization."]
      },
      "A valid organization is required."
    );
  }

  const scopeCheck = await validateLinkScope(
    user,
    organizationId,
    parsed.data.siteId,
    parsed.data.sourceDeviceId,
    parsed.data.targetDeviceId
  );

  if (!scopeCheck.organization || !scopeCheck.site) {
    return infrastructureValidationError(
      {
        siteId: ["Select a site within the chosen organization."]
      },
      "The selected site is outside your tenant scope."
    );
  }

  if (!scopeCheck.sourceDevice || !scopeCheck.targetDevice) {
    return infrastructureValidationError(
      {
        targetDeviceId: ["Select source and target devices from the same site."]
      },
      "Both devices must belong to the same site."
    );
  }

  if (parsed.data.sourceDeviceId === parsed.data.targetDeviceId) {
    return infrastructureValidationError(
      {
        targetDeviceId: ["Source and target must be different devices."]
      },
      "Device relationships cannot point to the same device."
    );
  }

  const safeRedirectPath = resolveInfrastructureRedirectPath(redirectPath, {
    siteId: parsed.data.siteId,
    deviceId: parsed.data.sourceDeviceId
  });

  await prisma.deviceLink.create({
    data: {
      organizationId,
      siteId: parsed.data.siteId,
      sourceDeviceId: parsed.data.sourceDeviceId,
      targetDeviceId: parsed.data.targetDeviceId,
      linkType: parsed.data.linkType,
      sourcePort: parsed.data.sourcePort ?? null,
      targetPort: parsed.data.targetPort ?? null,
      poeProvided: parsed.data.poeProvided,
      notes: parsed.data.notes ?? null
    }
  });

  revalidateInfrastructurePaths({
    redirectPath: safeRedirectPath,
    siteId: parsed.data.siteId,
    deviceId: parsed.data.sourceDeviceId
  });

  revalidatePath(`/devices/${parsed.data.targetDeviceId}`);
  redirect(safeRedirectPath);
}

export async function updateDeviceLinkAction(
  deviceLinkId: string,
  redirectPath: string,
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = deviceLinkFormSchema.safeParse(getDeviceLinkFormValues(formData));

  if (!parsed.success) {
    return infrastructureValidationError(parsed.error.flatten().fieldErrors);
  }

  const existingLink = await prisma.deviceLink.findFirst({
    where: {
      id: deviceLinkId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true
    }
  });

  if (!existingLink) {
    return {
      status: "error",
      message: "The device relationship could not be found."
    };
  }

  const scopeCheck = await validateLinkScope(
    user,
    existingLink.organizationId,
    parsed.data.siteId,
    parsed.data.sourceDeviceId,
    parsed.data.targetDeviceId
  );

  if (!scopeCheck.sourceDevice || !scopeCheck.targetDevice) {
    return infrastructureValidationError(
      {
        targetDeviceId: ["Select source and target devices from the same site."]
      },
      "Both devices must belong to the same site."
    );
  }

  if (parsed.data.sourceDeviceId === parsed.data.targetDeviceId) {
    return infrastructureValidationError(
      {
        targetDeviceId: ["Source and target must be different devices."]
      },
      "Device relationships cannot point to the same device."
    );
  }

  const safeRedirectPath = resolveInfrastructureRedirectPath(redirectPath, {
    siteId: parsed.data.siteId,
    deviceId: parsed.data.sourceDeviceId
  });

  await prisma.deviceLink.update({
    where: {
      id: deviceLinkId
    },
    data: {
      siteId: parsed.data.siteId,
      sourceDeviceId: parsed.data.sourceDeviceId,
      targetDeviceId: parsed.data.targetDeviceId,
      linkType: parsed.data.linkType,
      sourcePort: parsed.data.sourcePort ?? null,
      targetPort: parsed.data.targetPort ?? null,
      poeProvided: parsed.data.poeProvided,
      notes: parsed.data.notes ?? null
    }
  });

  revalidateInfrastructurePaths({
    redirectPath: safeRedirectPath,
    siteId: parsed.data.siteId,
    deviceId: parsed.data.sourceDeviceId
  });

  revalidatePath(`/devices/${parsed.data.targetDeviceId}`);
  redirect(safeRedirectPath);
}
