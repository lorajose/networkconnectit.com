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
    name: formData.get("name"),
    type: formData.get("type"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    ipAddress: formData.get("ipAddress"),
    macAddress: formData.get("macAddress"),
    serialNumber: formData.get("serialNumber"),
    status: formData.get("status"),
    monitoringMode: formData.get("monitoringMode"),
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
    parsed.data.siteId
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

  try {
    const device = await prisma.device.create({
      data: {
        organizationId,
        siteId: parsed.data.siteId,
        name: parsed.data.name,
        type: parsed.data.type,
        brand: parsed.data.brand,
        model: parsed.data.model ?? null,
        ipAddress: parsed.data.ipAddress ?? null,
        macAddress: parsed.data.macAddress ?? null,
        serialNumber: parsed.data.serialNumber ?? null,
        status: parsed.data.status,
        monitoringMode: parsed.data.monitoringMode,
        lastSeenAt: parsed.data.lastSeenAt ?? null,
        notes: parsed.data.notes ?? null
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/viewer");
    revalidatePath("/sites");
    revalidatePath("/devices");
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
      id: true
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

  const scopeCheck = await validateDeviceScope(
    user,
    organizationId,
    parsed.data.siteId
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

  try {
    await prisma.device.update({
      where: {
        id: deviceId
      },
      data: {
        organizationId,
        siteId: parsed.data.siteId,
        name: parsed.data.name,
        type: parsed.data.type,
        brand: parsed.data.brand,
        model: parsed.data.model ?? null,
        ipAddress: parsed.data.ipAddress ?? null,
        macAddress: parsed.data.macAddress ?? null,
        serialNumber: parsed.data.serialNumber ?? null,
        status: parsed.data.status,
        monitoringMode: parsed.data.monitoringMode,
        lastSeenAt: parsed.data.lastSeenAt ?? null,
        notes: parsed.data.notes ?? null
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/viewer");
    revalidatePath("/sites");
    revalidatePath("/devices");
    revalidatePath(`/devices/${deviceId}`);
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
