import {
  HandoffStatus,
  ProjectInstallationStatus,
  ProjectPriority,
  ProjectType
} from "@prisma/client";
import { z } from "zod";

import {
  optionalDate,
  optionalEmail,
  optionalTrimmedString,
  requiredTrimmedString
} from "@/lib/validations/shared";

export const projectInstallationStatusOptions = Object.values(
  ProjectInstallationStatus
);
export const projectTypeOptions = Object.values(ProjectType);
export const projectPriorityOptions = Object.values(ProjectPriority);
export const handoffStatusOptions = Object.values(HandoffStatus);

const siteIdsSchema = z.preprocess(
  (value) => {
    if (Array.isArray(value)) {
      return value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean);
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed ? [trimmed] : [];
    }

    return [];
  },
  z.array(z.string().min(1).max(191))
);

export const projectFormSchema = z
  .object({
    organizationId: requiredTrimmedString(1, 191),
    name: requiredTrimmedString(2, 191),
    projectCode: optionalTrimmedString(191),
    status: z.nativeEnum(ProjectInstallationStatus),
    projectType: z.nativeEnum(ProjectType),
    priority: z.nativeEnum(ProjectPriority),
    primarySiteId: optionalTrimmedString(191),
    siteIds: siteIdsSchema,
    installationDate: optionalDate(),
    goLiveDate: optionalDate(),
    warrantyStartAt: optionalDate(),
    warrantyEndAt: optionalDate(),
    clientContactName: optionalTrimmedString(191),
    clientContactEmail: optionalEmail(191),
    clientContactPhone: optionalTrimmedString(64),
    internalProjectManager: optionalTrimmedString(191),
    leadTechnician: optionalTrimmedString(191),
    salesOwner: optionalTrimmedString(191),
    scopeSummary: optionalTrimmedString(5000),
    remoteAccessMethod: optionalTrimmedString(191),
    handoffStatus: z.nativeEnum(HandoffStatus),
    monitoringReady: z.preprocess(
      (value) => value === true || value === "on" || value === "true",
      z.boolean()
    ),
    vendorSystemsPlanned: optionalTrimmedString(5000),
    externalReference: optionalTrimmedString(191),
    internalNotes: optionalTrimmedString(5000),
    clientFacingNotes: optionalTrimmedString(5000)
  })
  .superRefine((values, context) => {
    if (values.primarySiteId && !values.siteIds.includes(values.primarySiteId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["primarySiteId"],
        message: "Primary site must also be linked to the project."
      });
    }
  });

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
