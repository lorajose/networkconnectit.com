import {
  AccessType,
  DeviceLinkType,
  DeviceStatus,
  DeviceType,
  HandoffStatus,
  MonitoringMode,
  OrganizationStatus,
  ProjectInstallationStatus,
  ProjectPriority,
  ProjectType,
  SiteStatus
} from "@prisma/client";
import { z } from "zod";

import { slugPattern } from "@/lib/validations/shared";

function requiredText(max = 191, min = 1) {
  return z.string().trim().min(min).max(max);
}

function optionalText(max = 191) {
  return z.string().trim().max(max);
}

function optionalDateInput() {
  return z
    .string()
    .trim()
    .refine(
      (value) => value === "" || !Number.isNaN(new Date(value).getTime()),
      "Enter a valid date."
    );
}

function optionalDateTimeInput() {
  return z
    .string()
    .trim()
    .refine(
      (value) => value === "" || !Number.isNaN(new Date(value).getTime()),
      "Enter a valid date and time."
    );
}

function optionalIntegerInput(min: number, max: number) {
  return z
    .string()
    .trim()
    .refine((value) => {
      if (!value) {
        return true;
      }

      const parsed = Number(value);

      return Number.isInteger(parsed) && parsed >= min && parsed <= max;
    }, `Enter a value between ${min} and ${max}.`);
}

export const projectWizardStepIds = [
  "organization",
  "site",
  "project",
  "network",
  "core-infrastructure",
  "edge-devices",
  "mapping",
  "access-monitoring",
  "review"
] as const;

export type ProjectWizardStepId = (typeof projectWizardStepIds)[number];

export const coreDeviceTypeOptions = [
  DeviceType.ROUTER,
  DeviceType.SWITCH,
  DeviceType.NVR,
  DeviceType.ACCESS_POINT
] as const;

export const edgeDeviceTypeOptions = [
  DeviceType.CAMERA,
  DeviceType.ACCESS_CONTROL,
  DeviceType.SENSOR,
  DeviceType.SERVER,
  DeviceType.OTHER
] as const;

export const projectWizardOrganizationSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("existing"),
    existingOrganizationId: requiredText(),
    newOrganization: z.object({
      name: optionalText(),
      slug: optionalText(),
      contactName: optionalText(),
      contactEmail: optionalText(),
      phone: optionalText(64),
      status: z.nativeEnum(OrganizationStatus)
    })
  }),
  z.object({
    mode: z.literal("new"),
    existingOrganizationId: z.string(),
    newOrganization: z.object({
      name: requiredText(),
      slug: z
        .string()
        .trim()
        .min(2)
        .max(191)
        .regex(slugPattern, "Use lowercase letters, numbers, and hyphens only."),
      contactName: optionalText(),
      contactEmail: z.string().trim().max(191).refine((value) => {
        if (!value) {
          return true;
        }

        return z.string().email().safeParse(value).success;
      }, "Enter a valid email address."),
      phone: optionalText(64),
      status: z.nativeEnum(OrganizationStatus)
    })
  })
]);

export const projectWizardSiteSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("existing"),
    existingSiteId: requiredText(),
    newSite: z.object({
      name: optionalText(),
      addressLine1: optionalText(),
      addressLine2: optionalText(),
      city: optionalText(),
      stateRegion: optionalText(),
      postalCode: optionalText(32),
      country: optionalText(),
      latitude: optionalText(64),
      longitude: optionalText(64),
      timezone: optionalText(64),
      status: z.nativeEnum(SiteStatus),
      notes: optionalText(5000)
    })
  }),
  z.object({
    mode: z.literal("new"),
    existingSiteId: z.string(),
    newSite: z.object({
      name: requiredText(),
      addressLine1: optionalText(),
      addressLine2: optionalText(),
      city: optionalText(),
      stateRegion: optionalText(),
      postalCode: optionalText(32),
      country: requiredText(),
      latitude: z.string().trim().refine((value) => {
        if (!value) {
          return true;
        }

        const parsed = Number(value);
        return !Number.isNaN(parsed) && parsed >= -90 && parsed <= 90;
      }, "Latitude must be between -90 and 90."),
      longitude: z.string().trim().refine((value) => {
        if (!value) {
          return true;
        }

        const parsed = Number(value);
        return !Number.isNaN(parsed) && parsed >= -180 && parsed <= 180;
      }, "Longitude must be between -180 and 180."),
      timezone: optionalText(64),
      status: z.nativeEnum(SiteStatus),
      notes: optionalText(5000)
    })
  })
]);

export const projectWizardProjectSchema = z.object({
  name: requiredText(),
  projectCode: optionalText(),
  status: z.nativeEnum(ProjectInstallationStatus),
  projectType: z.nativeEnum(ProjectType),
  priority: z.nativeEnum(ProjectPriority),
  installationDate: optionalDateInput(),
  goLiveDate: optionalDateInput(),
  clientContactName: optionalText(),
  clientContactEmail: z.string().trim().max(191).refine((value) => {
    if (!value) {
      return true;
    }

    return z.string().email().safeParse(value).success;
  }, "Enter a valid email address."),
  clientContactPhone: optionalText(64),
  internalProjectManager: optionalText(),
  leadTechnician: optionalText(),
  salesOwner: optionalText(),
  scopeSummary: optionalText(5000),
  remoteAccessMethod: optionalText(),
  handoffStatus: z.nativeEnum(HandoffStatus),
  monitoringReady: z.boolean(),
  vendorSystemsPlanned: optionalText(5000),
  externalReference: optionalText(),
  internalNotes: optionalText(5000),
  clientFacingNotes: optionalText(5000)
});

export const projectWizardNetworkSegmentSchema = z.object({
  clientId: requiredText(),
  name: requiredText(),
  vlanId: optionalIntegerInput(1, 4094),
  subnetCidr: requiredText(64, 3),
  gatewayIp: optionalText(64),
  purpose: optionalText(),
  notes: optionalText(5000)
});

const baseWizardDeviceSchema = z.object({
  clientId: requiredText(),
  name: requiredText(),
  type: z.nativeEnum(DeviceType),
  brand: requiredText(),
  model: optionalText(),
  hostname: optionalText(),
  ipAddress: optionalText(64),
  macAddress: optionalText(64),
  serialNumber: optionalText(),
  firmwareVersion: optionalText(),
  monitoringMode: z.nativeEnum(MonitoringMode),
  status: z.nativeEnum(DeviceStatus),
  installedAt: optionalDateInput(),
  lastSeenAt: optionalDateTimeInput(),
  networkSegmentClientId: z.string().trim(),
  vendorExternalId: optionalText(),
  notes: optionalText(5000)
});

export const projectWizardCoreDeviceSchema = baseWizardDeviceSchema.extend({
  type: z.enum(coreDeviceTypeOptions)
});

export const projectWizardEdgeDeviceSchema = baseWizardDeviceSchema.extend({
  type: z.enum(edgeDeviceTypeOptions),
  mountLocation: optionalText()
});

export const projectWizardNvrMappingSchema = z
  .object({
    clientId: requiredText(),
    nvrDeviceClientId: requiredText(),
    cameraDeviceClientId: requiredText(),
    channelNumber: requiredText(16),
    recordingEnabled: z.boolean(),
    notes: optionalText(5000)
  })
  .superRefine((values, context) => {
    const parsed = Number(values.channelNumber);

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 256) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["channelNumber"],
        message: "Channel number must be between 1 and 256."
      });
    }

    if (values.nvrDeviceClientId === values.cameraDeviceClientId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cameraDeviceClientId"],
        message: "Camera and NVR must be different devices."
      });
    }
  });

export const projectWizardDeviceLinkSchema = z
  .object({
    clientId: requiredText(),
    sourceDeviceClientId: requiredText(),
    targetDeviceClientId: requiredText(),
    linkType: z.nativeEnum(DeviceLinkType),
    sourcePort: optionalText(),
    targetPort: optionalText(),
    poeProvided: z.enum(["", "true", "false"]),
    notes: optionalText(5000)
  })
  .superRefine((values, context) => {
    if (values.sourceDeviceClientId === values.targetDeviceClientId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetDeviceClientId"],
        message: "Source and target must be different devices."
      });
    }
  });

export const projectWizardAccessReferenceSchema = z
  .object({
    clientId: requiredText(),
    scope: z.enum(["PROJECT", "SITE", "DEVICE"]),
    deviceClientId: z.string().trim(),
    name: requiredText(),
    accessType: z.nativeEnum(AccessType),
    vaultProvider: optionalText(),
    vaultPath: optionalText(255),
    owner: optionalText(),
    remoteAccessMethod: optionalText(),
    notes: optionalText(5000),
    lastValidatedAt: optionalDateTimeInput()
  })
  .superRefine((values, context) => {
    if (values.scope === "DEVICE" && !values.deviceClientId.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deviceClientId"],
        message: "Choose a device when the access reference scope is device."
      });
    }
  });

export const projectWizardDraftSchema = z
  .object({
    organization: projectWizardOrganizationSchema,
    site: projectWizardSiteSchema,
    project: projectWizardProjectSchema,
    networkSegments: z.array(projectWizardNetworkSegmentSchema),
    coreDevices: z.array(projectWizardCoreDeviceSchema),
    edgeDevices: z.array(projectWizardEdgeDeviceSchema),
    mappings: z.object({
      nvrAssignments: z.array(projectWizardNvrMappingSchema),
      deviceLinks: z.array(projectWizardDeviceLinkSchema)
    }),
    accessAndMonitoring: z.object({
      accessReferences: z.array(projectWizardAccessReferenceSchema)
    })
  })
  .superRefine((values, context) => {
    if (values.organization.mode === "new" && values.site.mode === "existing") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["site", "existingSiteId"],
        message: "Choose a new site when the organization is being created inline."
      });
    }

    const allDevices = [...values.coreDevices, ...values.edgeDevices];
    const deviceIds = new Set(allDevices.map((device) => device.clientId));
    const segmentIds = new Set(values.networkSegments.map((segment) => segment.clientId));
    const nvrIds = new Set(
      values.coreDevices
        .filter((device) => device.type === DeviceType.NVR)
        .map((device) => device.clientId)
    );
    const cameraIds = new Set(
      values.edgeDevices
        .filter((device) => device.type === DeviceType.CAMERA)
        .map((device) => device.clientId)
    );

    allDevices.forEach((device, index) => {
      if (device.networkSegmentClientId && !segmentIds.has(device.networkSegmentClientId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [
            values.coreDevices.some((entry) => entry.clientId === device.clientId)
              ? "coreDevices"
              : "edgeDevices",
            index,
            "networkSegmentClientId"
          ],
          message: "Select a network segment created in this wizard."
        });
      }
    });

    values.mappings.nvrAssignments.forEach((assignment, index) => {
      if (!nvrIds.has(assignment.nvrDeviceClientId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mappings", "nvrAssignments", index, "nvrDeviceClientId"],
          message: "Choose an NVR added in the core infrastructure step."
        });
      }

      if (!cameraIds.has(assignment.cameraDeviceClientId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mappings", "nvrAssignments", index, "cameraDeviceClientId"],
          message: "Choose a camera added in the edge device step."
        });
      }
    });

    values.mappings.deviceLinks.forEach((link, index) => {
      if (!deviceIds.has(link.sourceDeviceClientId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mappings", "deviceLinks", index, "sourceDeviceClientId"],
          message: "Choose a source device added in this wizard."
        });
      }

      if (!deviceIds.has(link.targetDeviceClientId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mappings", "deviceLinks", index, "targetDeviceClientId"],
          message: "Choose a target device added in this wizard."
        });
      }
    });

    values.accessAndMonitoring.accessReferences.forEach((reference, index) => {
      if (reference.scope === "DEVICE" && !deviceIds.has(reference.deviceClientId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["accessAndMonitoring", "accessReferences", index, "deviceClientId"],
          message: "Choose a device added in this wizard."
        });
      }
    });
  });

export type ProjectWizardDraftValues = z.infer<typeof projectWizardDraftSchema>;
