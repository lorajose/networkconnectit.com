import { OrganizationStatus } from "@prisma/client";
import { z } from "zod";

import { slugPattern } from "@/lib/validations/shared";

export const organizationStatusOptions = Object.values(OrganizationStatus);

export const organizationFormSchema = z.object({
  name: z.string().trim().min(2).max(191),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(191)
    .regex(slugPattern, "Use lowercase letters, numbers, and hyphens only."),
  contactName: z
    .union([z.string().trim().max(191), z.literal("")])
    .transform((value) => value || undefined),
  contactEmail: z
    .union([
      z.string().trim().email("Enter a valid email address.").max(191),
      z.literal("")
    ])
    .transform((value) => value || undefined),
  phone: z
    .union([z.string().trim().max(64), z.literal("")])
    .transform((value) => value || undefined),
  status: z.nativeEnum(OrganizationStatus)
});

export type OrganizationFormValues = z.infer<typeof organizationFormSchema>;
