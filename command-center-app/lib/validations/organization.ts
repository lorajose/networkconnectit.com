import { OrganizationStatus } from "@prisma/client";
import { z } from "zod";

import { slugPattern } from "@/lib/validations/shared";

export const organizationStatusOptions = Object.values(OrganizationStatus);

const optionalText = (max: number) =>
  z.union([z.string().trim().max(max), z.literal("")]).transform((value) => value || undefined);
const optionalUrl = z.union([z.string().trim().url("Enter a valid URL including https://").max(512), z.literal("")]).transform((value) => value || undefined);
const optionalHexColor = z.union([z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Use a 6-digit hex color such as #0EA5E9."), z.literal("")]).transform((value) => value || undefined);

export const organizationFormSchema = z.object({
  name: z.string().trim().min(2).max(191),
  slug: z.string().trim().min(2).max(191).regex(slugPattern, "Use lowercase letters, numbers, and hyphens only."),
  contactName: optionalText(191),
  contactEmail: z.union([z.string().trim().email("Enter a valid email address.").max(191), z.literal("")]).transform((value) => value || undefined),
  phone: optionalText(64),
  status: z.nativeEnum(OrganizationStatus)
});

export const organizationProfileFormSchema = organizationFormSchema.extend({
  legalName: optionalText(191), websiteUrl: optionalUrl, description: optionalText(5000),
  addressLine1: optionalText(191), addressLine2: optionalText(191), city: optionalText(191),
  stateRegion: optionalText(191), postalCode: optionalText(32), country: optionalText(191), timezone: optionalText(64),
  logoUrl: optionalUrl, brandPrimaryColor: optionalHexColor, brandAccentColor: optionalHexColor, brandTagline: optionalText(191)
});

export type OrganizationFormValues = z.infer<typeof organizationFormSchema>;
export type OrganizationProfileFormValues = z.infer<typeof organizationProfileFormSchema>;
