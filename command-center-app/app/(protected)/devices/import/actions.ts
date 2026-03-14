"use server";

import { DeviceType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ManagementFormState } from "@/lib/management/form-state";
import {
  buildDeviceImportPreview,
  getDeviceImportBootstrap
} from "@/lib/management/device-import";
import { getUniqueConstraintFields } from "@/lib/management/prisma-errors";
import {
  getScopedOrganizationWhere,
  requireInventoryWriteAccess,
  resolveWritableOrganizationId
} from "@/lib/management/tenant";
import { deviceImportSubmissionSchema } from "@/lib/validations/device-import";

function importValidationError(
  message: string,
  fieldErrors?: Record<string, string[] | undefined>
): ManagementFormState {
  return {
    status: "error",
    message,
    fieldErrors
  };
}

export async function importDevicesFromCsvAction(
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const rawRows = formData.get("rows");
  const rawSelectedRowNumbers = formData.get("selectedRowNumbers");
  const rawOrganizationId = formData.get("organizationId");

  let rowsPayload: unknown;
  let selectedRowNumbersPayload: unknown;

  try {
    rowsPayload = JSON.parse(typeof rawRows === "string" ? rawRows : "[]");
    selectedRowNumbersPayload = JSON.parse(
      typeof rawSelectedRowNumbers === "string" ? rawSelectedRowNumbers : "[]"
    );
  } catch {
    return importValidationError(
      "The import payload could not be parsed. Upload the CSV again and retry."
    );
  }

  const parsedSubmission = deviceImportSubmissionSchema.safeParse({
    organizationId: typeof rawOrganizationId === "string" ? rawOrganizationId : "",
    rows: rowsPayload,
    selectedRowNumbers: selectedRowNumbersPayload
  });

  if (!parsedSubmission.success) {
    return importValidationError(
      "The import request is incomplete. Re-upload the CSV and confirm the rows again."
    );
  }

  const organizationId = resolveWritableOrganizationId(
    user,
    parsedSubmission.data.organizationId
  );

  if (!organizationId) {
    return importValidationError("Select an organization before importing devices.", {
      organizationId: ["Select an organization."]
    });
  }

  const accessibleOrganization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      ...getScopedOrganizationWhere(user)
    },
    select: {
      id: true
    }
  });

  if (!accessibleOrganization) {
    return importValidationError(
      "The selected organization is outside your tenant scope.",
      {
        organizationId: ["You do not have access to this organization."]
      }
    );
  }

  const bootstrap = await getDeviceImportBootstrap(user);
  const preview = buildDeviceImportPreview(
    parsedSubmission.data.rows,
    organizationId,
    bootstrap
  );
  const previewRowsByNumber = new Map(
    preview.rows.map((row) => [row.rowNumber, row] as const)
  );
  const selectedRows = parsedSubmission.data.selectedRowNumbers
    .map((rowNumber) => previewRowsByNumber.get(rowNumber))
    .filter(
      (
        row
      ): row is NonNullable<typeof row> => Boolean(row)
    );

  if (selectedRows.length === 0) {
    return importValidationError(
      "Select at least one valid row from the preview before importing."
    );
  }

  const invalidSelectedRows = selectedRows.filter((row) => !row.importValues);

  if (invalidSelectedRows.length > 0) {
    return importValidationError(
      `Rows ${invalidSelectedRows.map((row) => row.rowNumber).join(", ")} still have validation errors. Uncheck them or fix the CSV first.`
    );
  }

  const selectedRowNumbers = new Set(
    selectedRows.map((row) => row.rowNumber)
  );
  const missingDependencies = selectedRows.filter((row) =>
    row.dependencyRowNumbers.some(
      (dependencyRowNumber) => !selectedRowNumbers.has(dependencyRowNumber)
    )
  );

  if (missingDependencies.length > 0) {
    return importValidationError(
      `Rows ${missingDependencies
        .map((row) => row.rowNumber)
        .join(", ")} reference imported NVR rows that are not selected for import.`
    );
  }

  const rowsToImport = selectedRows.map((row) => row.importValues!);
  const existingNvrById = new Map(
    bootstrap.existingNvrs
      .filter((device) => device.organizationId === organizationId)
      .map((device) => [device.id, device])
  );

  try {
    await prisma.$transaction(async (transaction) => {
      const createdDevices = await Promise.all(
        rowsToImport.map(async (row) => {
          const createdDevice = await transaction.device.create({
            data: {
              organizationId,
              siteId: row.siteId,
              projectInstallationId: row.projectInstallationId,
              networkSegmentId: row.networkSegmentId,
              name: row.name,
              hostname: row.hostname,
              type: row.type,
              brand: row.brand,
              model: row.model,
              firmwareVersion: row.firmwareVersion,
              ipAddress: row.ipAddress,
              macAddress: row.macAddress,
              serialNumber: row.serialNumber,
              status: row.status,
              monitoringMode: row.monitoringMode,
              notes: row.notes
            },
            select: {
              id: true,
              siteId: true,
              type: true
            }
          });

          return {
            rowNumber: row.rowNumber,
            id: createdDevice.id,
            siteId: createdDevice.siteId,
            type: createdDevice.type,
            assignment: row.nvrAssignment
          };
        })
      );

      const createdDeviceByRowNumber = new Map(
        createdDevices.map((device) => [device.rowNumber, device] as const)
      );

      await Promise.all(
        createdDevices
          .filter((device) => device.assignment)
          .map(async (device) => {
            const assignment = device.assignment!;
            let nvrDeviceId = "";

            if (assignment.kind === "existing") {
              const existingNvr = existingNvrById.get(assignment.deviceId);

              if (!existingNvr || existingNvr.siteId !== device.siteId) {
                throw new Error(
                  `Imported row ${device.rowNumber} references an NVR outside the selected site scope.`
                );
              }

              nvrDeviceId = existingNvr.id;
            } else {
              const importedNvr = createdDeviceByRowNumber.get(
                assignment.importedRowNumber
              );

              if (
                !importedNvr ||
                importedNvr.type !== DeviceType.NVR ||
                importedNvr.siteId !== device.siteId
              ) {
                throw new Error(
                  `Imported row ${device.rowNumber} references an NVR row that was not created in the same site.`
                );
              }

              nvrDeviceId = importedNvr.id;
            }

            if (device.type !== DeviceType.CAMERA) {
              throw new Error(
                `Imported row ${device.rowNumber} attempted to create an NVR assignment for a non-camera device.`
              );
            }

            await transaction.nvrChannelAssignment.create({
              data: {
                organizationId,
                siteId: device.siteId,
                nvrDeviceId,
                cameraDeviceId: device.id,
                channelNumber: assignment.channelNumber,
                recordingEnabled: assignment.recordingEnabled
              }
            });
          })
      );
    });

    revalidatePath("/dashboard");
    revalidatePath("/viewer");
    revalidatePath("/devices");
    revalidatePath("/sites");
    revalidatePath("/alerts");
    revalidatePath("/projects");
  } catch (error) {
    const uniqueFields = getUniqueConstraintFields(error);

    if (uniqueFields.includes("serialNumber")) {
      return importValidationError(
        "One or more serial numbers already exist in the Command Center. Remove or correct the duplicate rows and try again."
      );
    }

    if (
      uniqueFields.includes("nvrDeviceId") ||
      uniqueFields.includes("cameraDeviceId") ||
      uniqueFields.includes("channelNumber")
    ) {
      return importValidationError(
        "One or more NVR channel assignments conflict with existing mappings."
      );
    }

    if (error instanceof Error) {
      return importValidationError(error.message);
    }

    return importValidationError(
      "Unable to complete the bulk device import right now."
    );
  }

  redirect(`/devices?organizationId=${organizationId}`);
}
