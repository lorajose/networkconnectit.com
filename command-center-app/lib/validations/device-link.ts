import { DeviceLinkType } from "@prisma/client";
import { z } from "zod";

import {
  optionalTrimmedString,
  requiredTrimmedString
} from "@/lib/validations/shared";

export const deviceLinkTypeOptions = Object.values(DeviceLinkType);

export const deviceLinkFormSchema = z
  .object({
    organizationId: requiredTrimmedString(1, 191),
    siteId: requiredTrimmedString(1, 191),
    sourceDeviceId: requiredTrimmedString(1, 191),
    targetDeviceId: requiredTrimmedString(1, 191),
    linkType: z.nativeEnum(DeviceLinkType),
    sourcePort: optionalTrimmedString(191),
    targetPort: optionalTrimmedString(191),
    poeProvided: z.preprocess((value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }

      if (value === true || value === "true") {
        return true;
      }

      if (value === false || value === "false") {
        return false;
      }

      return undefined;
    }, z.boolean().optional()),
    notes: optionalTrimmedString(5000)
  })
  .superRefine((values, context) => {
    if (values.sourceDeviceId === values.targetDeviceId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetDeviceId"],
        message: "Source and target must be different devices."
      });
    }
  });

export type DeviceLinkFormValues = z.infer<typeof deviceLinkFormSchema>;
