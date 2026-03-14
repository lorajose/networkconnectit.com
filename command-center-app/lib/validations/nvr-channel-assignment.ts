import { z } from "zod";

import {
  optionalTrimmedString,
  requiredInteger,
  requiredTrimmedString
} from "@/lib/validations/shared";

export const nvrChannelAssignmentFormSchema = z
  .object({
    organizationId: requiredTrimmedString(1, 191),
    siteId: requiredTrimmedString(1, 191),
    nvrDeviceId: requiredTrimmedString(1, 191),
    cameraDeviceId: requiredTrimmedString(1, 191),
    channelNumber: requiredInteger(1, 256),
    recordingEnabled: z.preprocess(
      (value) => value === true || value === "on" || value === "true",
      z.boolean()
    ),
    notes: optionalTrimmedString(5000)
  })
  .superRefine((values, context) => {
    if (values.nvrDeviceId === values.cameraDeviceId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cameraDeviceId"],
        message: "Camera and NVR must be different devices."
      });
    }
  });

export type NvrChannelAssignmentFormValues = z.infer<
  typeof nvrChannelAssignmentFormSchema
>;
