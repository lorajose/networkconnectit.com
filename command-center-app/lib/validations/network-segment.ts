import { z } from "zod";

import {
  optionalInteger,
  optionalTrimmedString,
  requiredTrimmedString
} from "@/lib/validations/shared";

export const networkSegmentFormSchema = z.object({
  organizationId: requiredTrimmedString(1, 191),
  siteId: requiredTrimmedString(1, 191),
  name: requiredTrimmedString(2, 191),
  vlanId: optionalInteger(1, 4094),
  subnetCidr: requiredTrimmedString(3, 64),
  gatewayIp: optionalTrimmedString(64),
  purpose: optionalTrimmedString(191),
  notes: optionalTrimmedString(5000)
});

export type NetworkSegmentFormValues = z.infer<
  typeof networkSegmentFormSchema
>;
