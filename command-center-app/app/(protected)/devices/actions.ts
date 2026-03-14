"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ManagementFormState } from "@/lib/management/form-state";
import { getUniqueConstraintFields } from "@/lib/management/prisma-errors";
import {
  getScopedOrganizationWhere,
  getScopedRecordWhere,
  requireInventoryWriteAccess,
  resolveWritableOrganizationId,
  type TenantUser
} from "@/lib/management/tenant";
import { deviceFormSchema } from "@/lib/validations/device";

function getDeviceFormValues(formData: FormData) {
  return {
    organizationId: formData.get("organizationId"),
    siteId: formData.get("siteId"),
    projectInstallationId: formData.get("projectInstallationId"),
    networkSegmentId: formData.get("networkSegmentId"),
    name: formData.get("name"),
    hostname: formData.get("hostname"),
    type: formData.get("type"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    firmwareVersion: formData.get("firmwareVersion"),
    vendorExternalId: formData.get("vendorExternalId"),
    ipAddress: formData.get("ipAddress"),
    macAddress: formData.get("macAddress"),
    serialNumber: formData.get("serialNumber"),
    switchRole: formData.get("switchRole"),
    portCount: formData.get("portCount"),
    usedPortCount: formData.get("usedPortCount"),
    poeBudgetWatts: formData.get("poeBudgetWatts"),
    poeUsedWatts: formData.get("poeUsedWatts"),
    poeRequired: formData.get("poeRequired"),
    estimatedPoeWatts: formData.get("estimatedPoeWatts"),
    status: formData.get("status"),
    monitoringMode: formData.get("monitoringMode"),
    installedAt: formData.get("installedAt"),
    lastSeenAt: formData.get("lastSeenAt"),
    notes: formData.get("notes")
  };
}

function deviceValidationError(
  fieldErrors: Record<string, string[] | undefined>,
  message = "Review the highlighted fields and try again."
): ManagementFormState {
  return {
    status: "error",
    message,
    fieldErrors
  };
}

async function validateDeviceScope(
  user: TenantUser,
  organizationId: string,
  siteId: string,
  projectInstallationId: string | null | undefined,
  networkSegmentId: string | null | undefined
) {
  const [organization, site, projectInstallation, networkSegment] =
    await Promise.all([
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
      networkSegmentId
        ? prisma.networkSegment.findFirst({
            where: {
              id: networkSegmentId,
              organizationId,
              siteId,
              ...getScopedRecordWhere(user)
            },
            select: {
              id: true
            }
          })
        : Promise.resolve(null)
    ]);

  return {
    organization,
    site,
    projectInstallation,
    networkSegment
  };
}

export async function createDeviceAction(
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = deviceFormSchema.safeParse(getDeviceFormValues(formData));

  if (!parsed.success) {
    return deviceValidationError(parsed.error.flatten().fieldErrors);
  }

  const organizationId = resolveWritableOrganizationId(
    user,
    parsed.data.organizationId
  );

  if (!organizationId) {
    return deviceValidationError(
      {
        organizationId: ["Select an organization."]
      },
      "A valid organization is required."
    );
  }

  const scopeCheck = await validateDeviceScope(
    user,
    organizationId,
    parsed.data.siteId,
    parsed.data.projectInstallationId,
    parsed.data.networkSegmentId
  );

  if (!scopeCheck.organization) {
    return deviceValidationError(
      {
        organizationId: ["You do not have access to this organization."]
      },
      "The selected organization is outside your tenant scope."
    );
  }

  if (!scopeCheck.site) {
    return deviceValidationError(
      {
        siteId: ["Select a site that belongs to the chosen organization."]
      },
      "The selected site does not match the organization."
    );
  }

  if (parsed.data.projectInstallationId && !scopeCheck.projectInstallation) {
    return deviceValidationError(
      {
        projectInstallationId: ["Select a project that belongs to the chosen organization."]
      },
      "The selected project does not match the organization."
    );
  }

  if (parsed.data.networkSegmentId && !scopeCheck.networkSegment) {
    return deviceValidationError(
      {
        networkSegmentId: ["Select a network segment that belongs to the chosen site."]
      },
      "The selected network segment does not match the site."
    );
  }

  try {
    const device = await prisma.device.create({
      data: {
        organizationId,
        siteId: parsed.data.siteId,
        projectInstallationId: parsed.data.projectInstallationId ?? null,
        networkSegmentId: parsed.data.networkSegmentId ?? null,
        name: parsed.data.name,
        hostname: parsed.data.hostname ?? null,
        type: parsed.data.type,
        brand: parsed.data.brand,
        model: parsed.data.model ?? null,
        firmwareVersion: parsed.data.firmwareVersion ?? null,
        vendorExternalId: parsed.data.vendorExternalId ?? null,
        ipAddress: parsed.data.ipAddress ?? null,
        macAddress: parsed.data.macAddress ?? null,
        serialNumber: parsed.data.serialNumber ?? null,
        switchRole: parsed.data.switchRole ?? null,
        portCount: parsed.data.portCount ?? null,
        usedPortCount: parsed.data.usedPortCount ?? null,
        poeBudgetWatts: parsed.data.poeBudgetWatts ?? null,
        poeUsedWatts: parsed.data.poeUsedWatts ?? null,
        poeRequired: parsed.data.poeRequired ?? null,
        estimatedPoeWatts: parsed.data.estimatedPoeWatts ?? null,
        status: parsed.data.status,
        monitoringMode: parsed.data.monitoringMode,
        installedAt: parsed.data.installedAt ?? null,
        lastSeenAt: parsed.data.lastSeenAt ?? null,
        notes: parsed.data.notes ?? null
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/viewer");
    revalidatePath("/sites");
    revalidatePath("/devices");
    revalidatePath("/projects");

    if (parsed.data.projectInstallationId) {
      revalidatePath(`/projects/${parsed.data.projectInstallationId}`);
    }

    redirect(`/devices/${device.id}`);
  } catch (error) {
    const uniqueFields = getUniqueConstraintFields(error);

    if (uniqueFields.includes("serialNumber")) {
      return deviceValidationError(
        {
          serialNumber: ["This serial number is already assigned."]
        },
        "Use a unique serial number or leave it blank."
      );
    }

    return {
      status: "error",
      message: "Unable to save the device right now."
    };
  }
}

export async function updateDeviceAction(
  deviceId: string,
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = deviceFormSchema.safeParse(getDeviceFormValues(formData));

  if (!parsed.success) {
    return deviceValidationError(parsed.error.flatten().fieldErrors);
  }

  const existingDevice = await prisma.device.findFirst({
    where: {
      id: deviceId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true,
      siteId: true,
      projectInstallationId: true
    }
  });

  if (!existingDevice) {
    return {
      status: "error",
      message: "The device could not be found."
    };
  }

  const organizationId = resolveWritableOrganizationId(
    user,
    parsed.data.organizationId
  );

  if (!organizationId) {
    return deviceValidationError(
      {
        organizationId: ["Select an organization."]
      },
      "A valid organization is required."
    );
  }

  if (
    organizationId !== existingDevice.organizationId ||
    parsed.data.siteId !== existingDevice.siteId
  ) {
    return deviceValidationError(
      {
        siteId: ["Changing the organization or site on an existing device is not supported."]
      },
      "Device ownership must remain stable for linked alerts, health checks, and topology records."
    );
  }

  const scopeCheck = await validateDeviceScope(
    user,
    organizationId,
    parsed.data.siteId,
    parsed.data.projectInstallationId,
    parsed.data.networkSegmentId
  );

  if (!scopeCheck.organization) {
    return deviceValidationError(
      {
        organizationId: ["You do not have access to this organization."]
      },
      "The selected organization is outside your tenant scope."
    );
  }

  if (!scopeCheck.site) {
    return deviceValidationError(
      {
        siteId: ["Select a site that belongs to the chosen organization."]
      },
      "The selected site does not match the organization."
    );
  }

  if (parsed.data.projectInstallationId && !scopeCheck.projectInstallation) {
    return deviceValidationError(
      {
        projectInstallationId: ["Select a project that belongs to the chosen organization."]
      },
      "The selected project does not match the organization."
    );
  }

  if (parsed.data.networkSegmentId && !scopeCheck.networkSegment) {
    return deviceValidationError(
      {
        networkSegmentId: ["Select a network segment that belongs to the chosen site."]
      },
      "The selected network segment does not match the site."
    );
  }

  try {
    await prisma.device.update({
      where: {
        id: deviceId
      },
      data: {
        organizationId,
        siteId: parsed.data.siteId,
        projectInstallationId: parsed.data.projectInstallationId ?? null,
        networkSegmentId: parsed.data.networkSegmentId ?? null,
        name: parsed.data.name,
        hostname: parsed.data.hostname ?? null,
        type: parsed.data.type,
        brand: parsed.data.brand,
        model: parsed.data.model ?? null,
        firmwareVersion: parsed.data.firmwareVersion ?? null,
        vendorExternalId: parsed.data.vendorExternalId ?? null,
        ipAddress: parsed.data.ipAddress ?? null,
        macAddress: parsed.data.macAddress ?? null,
        serialNumber: parsed.data.serialNumber ?? null,
        switchRole: parsed.data.switchRole ?? null,
        portCount: parsed.data.portCount ?? null,
        usedPortCount: parsed.data.usedPortCount ?? null,
        poeBudgetWatts: parsed.data.poeBudgetWatts ?? null,
        poeUsedWatts: parsed.data.poeUsedWatts ?? null,
        poeRequired: parsed.data.poeRequired ?? null,
        estimatedPoeWatts: parsed.data.estimatedPoeWatts ?? null,
        status: parsed.data.status,
        monitoringMode: parsed.data.monitoringMode,
        installedAt: parsed.data.installedAt ?? null,
        lastSeenAt: parsed.data.lastSeenAt ?? null,
        notes: parsed.data.notes ?? null
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/viewer");
    revalidatePath("/sites");
    revalidatePath("/devices");
    revalidatePath("/projects");
    revalidatePath(`/devices/${deviceId}`);

    if (existingDevice.projectInstallationId) {
      revalidatePath(`/projects/${existingDevice.projectInstallationId}`);
    }

    if (parsed.data.projectInstallationId) {
      revalidatePath(`/projects/${parsed.data.projectInstallationId}`);
    }

    redirect(`/devices/${deviceId}`);
  } catch (error) {
    const uniqueFields = getUniqueConstraintFields(error);

    if (uniqueFields.includes("serialNumber")) {
      return deviceValidationError(
        {
          serialNumber: ["This serial number is already assigned."]
        },
        "Use a unique serial number or leave it blank."
      );
    }

    return {
      status: "error",
      message: "Unable to update the device right now."
    };
  }
}
