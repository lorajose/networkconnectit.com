"use server";

import { DeviceType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ManagementFormState } from "@/lib/management/form-state";
import { getUniqueConstraintFields } from "@/lib/management/prisma-errors";
import {
  getScopedOrganizationWhere,
  getScopedRecordWhere,
  isGlobalAccessUser,
  requireInventoryWriteAccess
} from "@/lib/management/tenant";
import { projectWizardDraftSchema } from "@/lib/validations/project-wizard";

function wizardValidationError(
  message: string,
  fieldErrors?: Record<string, string[] | undefined>
): ManagementFormState {
  return {
    status: "error",
    message,
    fieldErrors
  };
}

function getNullableString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getNullableDate(value: string) {
  const trimmed = value.trim();
  return trimmed ? new Date(trimmed) : null;
}

function getNullableNumber(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

function appendPlacementToNotes(notes: string, placement?: string) {
  const cleanedNotes = notes.trim();
  const cleanedPlacement = placement?.trim();

  if (!cleanedPlacement) {
    return cleanedNotes || null;
  }

  if (!cleanedNotes) {
    return `Mount / location: ${cleanedPlacement}`;
  }

  return `Mount / location: ${cleanedPlacement}\n\n${cleanedNotes}`;
}

function revalidateWizardPaths(projectId: string, siteId: string, organizationId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/viewer");
  revalidatePath("/projects");
  revalidatePath("/projects/new");
  revalidatePath("/projects/new/wizard");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/sites");
  revalidatePath(`/sites/${siteId}`);
  revalidatePath("/devices");
  revalidatePath("/organizations");
  revalidatePath(`/organizations/${organizationId}`);
}

export async function submitProjectWizardAction(
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const rawDraft = formData.get("draft");

  if (typeof rawDraft !== "string" || !rawDraft.trim()) {
    return wizardValidationError("The wizard draft is missing. Refresh the page and try again.");
  }

  let draftPayload: unknown;

  try {
    draftPayload = JSON.parse(rawDraft);
  } catch {
    return wizardValidationError("The wizard draft could not be read. Refresh the page and try again.");
  }

  const parsed = projectWizardDraftSchema.safeParse(draftPayload);

  if (!parsed.success) {
    return wizardValidationError(
      "Review the wizard data and fix the highlighted step errors before submitting."
    );
  }

  const draft = parsed.data;

  if (draft.organization.mode === "new" && !isGlobalAccessUser(user)) {
    return wizardValidationError(
      "Only internal command center roles can create organizations from the project wizard."
    );
  }

  try {
    const createdProject = await prisma.$transaction(async (transaction) => {
      let organizationId: string;

      if (draft.organization.mode === "new") {
        const organization = await transaction.organization.create({
          data: {
            name: draft.organization.newOrganization.name.trim(),
            slug: draft.organization.newOrganization.slug.trim(),
            contactName: getNullableString(draft.organization.newOrganization.contactName),
            contactEmail: getNullableString(draft.organization.newOrganization.contactEmail),
            phone: getNullableString(draft.organization.newOrganization.phone),
            status: draft.organization.newOrganization.status
          },
          select: {
            id: true
          }
        });

        organizationId = organization.id;
      } else {
        const selectedOrganizationId = isGlobalAccessUser(user)
          ? draft.organization.existingOrganizationId
          : user.organizationId;

        if (!selectedOrganizationId) {
          throw new Error("A writable organization is required.");
        }

        const organization = await transaction.organization.findFirst({
          where: {
            id: selectedOrganizationId,
            ...getScopedOrganizationWhere(user)
          },
          select: {
            id: true
          }
        });

        if (!organization) {
          throw new Error("The selected organization is outside your tenant scope.");
        }

        organizationId = organization.id;
      }

      let siteId: string;

      if (draft.site.mode === "new") {
        const site = await transaction.site.create({
          data: {
            organizationId,
            name: draft.site.newSite.name.trim(),
            addressLine1: getNullableString(draft.site.newSite.addressLine1),
            addressLine2: getNullableString(draft.site.newSite.addressLine2),
            city: getNullableString(draft.site.newSite.city),
            stateRegion: getNullableString(draft.site.newSite.stateRegion),
            postalCode: getNullableString(draft.site.newSite.postalCode),
            country: draft.site.newSite.country.trim(),
            latitude: getNullableNumber(draft.site.newSite.latitude),
            longitude: getNullableNumber(draft.site.newSite.longitude),
            timezone: getNullableString(draft.site.newSite.timezone),
            status: draft.site.newSite.status,
            notes: getNullableString(draft.site.newSite.notes)
          },
          select: {
            id: true
          }
        });

        siteId = site.id;
      } else {
        const site = await transaction.site.findFirst({
          where: {
            id: draft.site.existingSiteId,
            organizationId,
            ...getScopedRecordWhere(user)
          },
          select: {
            id: true
          }
        });

        if (!site) {
          throw new Error("The selected site is outside the chosen organization or tenant scope.");
        }

        siteId = site.id;
      }

      const project = await transaction.projectInstallation.create({
        data: {
          organizationId,
          primarySiteId: siteId,
          name: draft.project.name.trim(),
          projectCode: getNullableString(draft.project.projectCode),
          status: draft.project.status,
          projectType: draft.project.projectType,
          priority: draft.project.priority,
          installationDate: getNullableDate(draft.project.installationDate),
          goLiveDate: getNullableDate(draft.project.goLiveDate),
          clientContactName: getNullableString(draft.project.clientContactName),
          clientContactEmail: getNullableString(draft.project.clientContactEmail),
          clientContactPhone: getNullableString(draft.project.clientContactPhone),
          internalProjectManager: getNullableString(draft.project.internalProjectManager),
          leadTechnician: getNullableString(draft.project.leadTechnician),
          salesOwner: getNullableString(draft.project.salesOwner),
          scopeSummary: getNullableString(draft.project.scopeSummary),
          remoteAccessMethod: getNullableString(draft.project.remoteAccessMethod),
          handoffStatus: draft.project.handoffStatus,
          monitoringReady: draft.project.monitoringReady,
          vendorSystemsPlanned: getNullableString(draft.project.vendorSystemsPlanned),
          externalReference: getNullableString(draft.project.externalReference),
          internalNotes: getNullableString(draft.project.internalNotes),
          clientFacingNotes: getNullableString(draft.project.clientFacingNotes)
        },
        select: {
          id: true
        }
      });

      await transaction.projectSite.create({
        data: {
          organizationId,
          projectInstallationId: project.id,
          siteId,
          roleOrPhase: "Primary site"
        }
      });

      const segmentIdMap = new Map<string, string>();

      for (const segment of draft.networkSegments) {
        const createdSegment = await transaction.networkSegment.create({
          data: {
            organizationId,
            siteId,
            name: segment.name.trim(),
            vlanId: getNullableNumber(segment.vlanId),
            subnetCidr: segment.subnetCidr.trim(),
            gatewayIp: getNullableString(segment.gatewayIp),
            purpose: getNullableString(segment.purpose),
            notes: getNullableString(segment.notes)
          },
          select: {
            id: true
          }
        });

        segmentIdMap.set(segment.clientId, createdSegment.id);
      }

      const createdDevices = new Map<
        string,
        {
          id: string;
          type: DeviceType;
          siteId: string;
        }
      >();

      for (const device of [...draft.coreDevices, ...draft.edgeDevices]) {
        const createdDevice = await transaction.device.create({
          data: {
            organizationId,
            siteId,
            projectInstallationId: project.id,
            networkSegmentId: device.networkSegmentClientId
              ? segmentIdMap.get(device.networkSegmentClientId) ?? null
              : null,
            name: device.name.trim(),
            hostname: getNullableString(device.hostname),
            type: device.type,
            brand: device.brand.trim(),
            model: getNullableString(device.model),
            firmwareVersion: getNullableString(device.firmwareVersion),
            vendorExternalId: getNullableString(device.vendorExternalId),
            ipAddress: getNullableString(device.ipAddress),
            macAddress: getNullableString(device.macAddress),
            serialNumber: getNullableString(device.serialNumber),
            status: device.status,
            monitoringMode: device.monitoringMode,
            installedAt: getNullableDate(device.installedAt),
            lastSeenAt: getNullableDate(device.lastSeenAt),
            notes: "mountLocation" in device
              ? appendPlacementToNotes(device.notes, device.mountLocation)
              : getNullableString(device.notes)
          },
          select: {
            id: true,
            type: true,
            siteId: true
          }
        });

        createdDevices.set(device.clientId, createdDevice);
      }

      for (const assignment of draft.mappings.nvrAssignments) {
        const nvrDevice = createdDevices.get(assignment.nvrDeviceClientId);
        const cameraDevice = createdDevices.get(assignment.cameraDeviceClientId);

        if (!nvrDevice || !cameraDevice) {
          throw new Error("NVR mappings reference devices that were not created.");
        }

        if (nvrDevice.type !== DeviceType.NVR || cameraDevice.type !== DeviceType.CAMERA) {
          throw new Error("NVR mappings must connect an NVR device to a camera device.");
        }

        if (nvrDevice.siteId !== cameraDevice.siteId) {
          throw new Error("NVR mappings must stay within the same site.");
        }

        await transaction.nvrChannelAssignment.create({
          data: {
            organizationId,
            siteId,
            nvrDeviceId: nvrDevice.id,
            cameraDeviceId: cameraDevice.id,
            channelNumber: Number(assignment.channelNumber),
            recordingEnabled: assignment.recordingEnabled,
            notes: getNullableString(assignment.notes)
          }
        });
      }

      for (const link of draft.mappings.deviceLinks) {
        const sourceDevice = createdDevices.get(link.sourceDeviceClientId);
        const targetDevice = createdDevices.get(link.targetDeviceClientId);

        if (!sourceDevice || !targetDevice) {
          throw new Error("Device links reference devices that were not created.");
        }

        if (sourceDevice.siteId !== targetDevice.siteId) {
          throw new Error("Device links must remain within the same site.");
        }

        await transaction.deviceLink.create({
          data: {
            organizationId,
            siteId,
            sourceDeviceId: sourceDevice.id,
            targetDeviceId: targetDevice.id,
            linkType: link.linkType,
            sourcePort: getNullableString(link.sourcePort),
            targetPort: getNullableString(link.targetPort),
            poeProvided:
              link.poeProvided === ""
                ? null
                : link.poeProvided === "true",
            notes: getNullableString(link.notes)
          }
        });
      }

      for (const reference of draft.accessAndMonitoring.accessReferences) {
        let deviceId: string | null = null;
        let projectInstallationId: string | null = null;
        let scopedSiteId: string | null = null;

        if (reference.scope === "PROJECT") {
          projectInstallationId = project.id;
        }

        if (reference.scope === "SITE") {
          scopedSiteId = siteId;
        }

        if (reference.scope === "DEVICE") {
          const targetDevice = createdDevices.get(reference.deviceClientId);

          if (!targetDevice) {
            throw new Error("An access reference points to a device that was not created.");
          }

          deviceId = targetDevice.id;
        }

        await transaction.accessReference.create({
          data: {
            organizationId,
            siteId: scopedSiteId,
            projectInstallationId,
            deviceId,
            name: reference.name.trim(),
            accessType: reference.accessType,
            vaultProvider: getNullableString(reference.vaultProvider),
            vaultPath: getNullableString(reference.vaultPath),
            owner: getNullableString(reference.owner),
            remoteAccessMethod: getNullableString(reference.remoteAccessMethod),
            notes: getNullableString(reference.notes),
            lastValidatedAt: getNullableDate(reference.lastValidatedAt)
          }
        });
      }

      return {
        id: project.id,
        siteId,
        organizationId
      };
    });

    revalidateWizardPaths(
      createdProject.id,
      createdProject.siteId,
      createdProject.organizationId
    );
    redirect(`/projects/${createdProject.id}`);
  } catch (error) {
    const uniqueFields = getUniqueConstraintFields(error);

    if (uniqueFields.includes("slug")) {
      return wizardValidationError(
        "That organization slug is already in use. Update the organization step and try again."
      );
    }

    if (uniqueFields.includes("organizationId") && uniqueFields.includes("projectCode")) {
      return wizardValidationError(
        "That project code already exists in the selected organization. Choose a different code or leave it blank."
      );
    }

    if (uniqueFields.includes("siteId") && uniqueFields.includes("name")) {
      return wizardValidationError(
        "A network segment name is duplicated for the selected site. Review the network profile step."
      );
    }

    if (error instanceof Error) {
      return wizardValidationError(error.message);
    }

    return wizardValidationError("Unable to finish project onboarding right now. Please try again.");
  }
}
