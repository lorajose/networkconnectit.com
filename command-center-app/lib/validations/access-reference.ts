import { AccessType } from "@prisma/client";
import { z } from "zod";

import {
  optionalDate,
  optionalTrimmedString,
  requiredTrimmedString
} from "@/lib/validations/shared";

export const accessTypeOptions = Object.values(AccessType);

export const accessReferenceFormSchema = z
  .object({
    organizationId: requiredTrimmedString(1, 191),
    siteId: optionalTrimmedString(191),
    projectInstallationId: optionalTrimmedString(191),
    deviceId: optionalTrimmedString(191),
    name: requiredTrimmedString(2, 191),
    accessType: z.nativeEnum(AccessType),
    vaultProvider: optionalTrimmedString(191),
    vaultPath: optionalTrimmedString(255),
    owner: optionalTrimmedString(191),
    remoteAccessMethod: optionalTrimmedString(191),
    notes: optionalTrimmedString(5000),
    lastValidatedAt: optionalDate()
  })
  .superRefine((values, context) => {
    if (
      !values.siteId &&
      !values.projectInstallationId &&
      !values.deviceId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: "Associate the access reference to a project, site, or device."
      });
    }
  });

export type AccessReferenceFormValues = z.infer<
  typeof accessReferenceFormSchema
>;
