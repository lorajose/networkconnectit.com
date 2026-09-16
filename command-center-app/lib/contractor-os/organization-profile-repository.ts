import { prisma } from "@/lib/db";
import { requireOrganizationProfileWriteAccess, type OrganizationProfileActor } from "./organization-profile-access";
import type { OrganizationProfileFormValues } from "@/lib/validations/organization";

const clean = (value?: string) => value?.trim() || null;

export async function updateOrganizationProfile(actor: OrganizationProfileActor, organizationId: string, values: OrganizationProfileFormValues) {
  const scopedOrganizationId = requireOrganizationProfileWriteAccess(actor, organizationId);
  const existing = await prisma.organization.findUnique({ where: { id: scopedOrganizationId }, select: { id: true } });
  if (!existing) throw new Error("Organization not found");

  return prisma.organization.update({
    where: { id: scopedOrganizationId },
    data: {
      name: values.name.trim(), slug: values.slug.trim().toLowerCase(), legalName: clean(values.legalName),
      contactName: clean(values.contactName), contactEmail: values.contactEmail?.trim().toLowerCase() || null,
      phone: clean(values.phone), websiteUrl: clean(values.websiteUrl), description: clean(values.description),
      addressLine1: clean(values.addressLine1), addressLine2: clean(values.addressLine2), city: clean(values.city),
      stateRegion: clean(values.stateRegion), postalCode: clean(values.postalCode), country: clean(values.country), timezone: clean(values.timezone),
      logoUrl: clean(values.logoUrl), brandPrimaryColor: clean(values.brandPrimaryColor), brandAccentColor: clean(values.brandAccentColor),
      brandTagline: clean(values.brandTagline), status: values.status
    }
  });
}
