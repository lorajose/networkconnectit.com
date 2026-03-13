import { SiteStatus } from "@prisma/client";
import { z } from "zod";

import {
  optionalNumber,
  optionalTrimmedString,
  requiredTrimmedString
} from "@/lib/validations/shared";

export const siteStatusOptions = Object.values(SiteStatus);

export const siteFormSchema = z.object({
  organizationId: requiredTrimmedString(1, 191),
  name: requiredTrimmedString(2, 191),
  addressLine1: optionalTrimmedString(191),
  addressLine2: optionalTrimmedString(191),
  city: optionalTrimmedString(191),
  stateRegion: optionalTrimmedString(191),
  postalCode: optionalTrimmedString(32),
  country: requiredTrimmedString(2, 191),
  latitude: optionalNumber().refine(
    (value) => value === undefined || (value >= -90 && value <= 90),
    "Latitude must be between -90 and 90."
  ),
  longitude: optionalNumber().refine(
    (value) => value === undefined || (value >= -180 && value <= 180),
    "Longitude must be between -180 and 180."
  ),
  timezone: optionalTrimmedString(64),
  status: z.nativeEnum(SiteStatus),
  notes: optionalTrimmedString(5000)
});

export type SiteFormValues = z.infer<typeof siteFormSchema>;
