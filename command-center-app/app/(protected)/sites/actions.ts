"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ManagementFormState } from "@/lib/management/form-state";
import { getUniqueConstraintFields } from "@/lib/management/prisma-errors";
import {
  getScopedOrganizationWhere,
  getScopedRecordWhere,
  requireInventoryWriteAccess,
  resolveWritableOrganizationId
} from "@/lib/management/tenant";
import { siteFormSchema } from "@/lib/validations/site";

function getSiteFormValues(formData: FormData) {
  return {
    organizationId: formData.get("organizationId"),
    name: formData.get("name"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    city: formData.get("city"),
    stateRegion: formData.get("stateRegion"),
    postalCode: formData.get("postalCode"),
    country: formData.get("country"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    timezone: formData.get("timezone"),
    status: formData.get("status"),
    notes: formData.get("notes")
  };
}

function siteValidationError(
  fieldErrors: Record<string, string[] | undefined>,
  message = "Review the highlighted fields and try again."
): ManagementFormState {
  return {
    status: "error",
    message,
    fieldErrors
  };
}

export async function createSiteAction(
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = siteFormSchema.safeParse(getSiteFormValues(formData));

  if (!parsed.success) {
    return siteValidationError(parsed.error.flatten().fieldErrors);
  }

  const organizationId = resolveWritableOrganizationId(
    user,
    parsed.data.organizationId
  );

  if (!organizationId) {
    return siteValidationError(
      {
        organizationId: ["Select an organization."]
      },
      "A valid organization is required."
    );
  }

  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      ...getScopedOrganizationWhere(user)
    },
    select: {
      id: true
    }
  });

  if (!organization) {
    return siteValidationError(
      {
        organizationId: ["You do not have access to this organization."]
      },
      "The selected organization is outside your tenant scope."
    );
  }

  try {
    const site = await prisma.site.create({
      data: {
        organizationId,
        name: parsed.data.name,
        addressLine1: parsed.data.addressLine1 ?? null,
        addressLine2: parsed.data.addressLine2 ?? null,
        city: parsed.data.city ?? null,
        stateRegion: parsed.data.stateRegion ?? null,
        postalCode: parsed.data.postalCode ?? null,
        country: parsed.data.country,
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
        timezone: parsed.data.timezone ?? null,
        status: parsed.data.status,
        notes: parsed.data.notes ?? null
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/viewer");
    revalidatePath("/sites");
    revalidatePath("/devices");
    redirect(`/sites/${site.id}`);
  } catch (error) {
    const uniqueFields = getUniqueConstraintFields(error);

    if (uniqueFields.includes("organizationId") && uniqueFields.includes("name")) {
      return siteValidationError(
        {
          name: ["A site with this name already exists in the organization."]
        },
        "Choose a unique site name for this organization."
      );
    }

    return {
      status: "error",
      message: "Unable to save the site right now."
    };
  }
}

export async function updateSiteAction(
  siteId: string,
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = siteFormSchema.safeParse(getSiteFormValues(formData));

  if (!parsed.success) {
    return siteValidationError(parsed.error.flatten().fieldErrors);
  }

  const existingSite = await prisma.site.findFirst({
    where: {
      id: siteId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true
    }
  });

  if (!existingSite) {
    return {
      status: "error",
      message: "The site could not be found."
    };
  }

  if (parsed.data.organizationId !== existingSite.organizationId) {
    return siteValidationError(
      {
        organizationId: ["Changing the organization on an existing site is not supported."]
      },
      "Site ownership must remain stable for existing devices and alerts."
    );
  }

  try {
    await prisma.site.update({
      where: {
        id: siteId
      },
      data: {
        name: parsed.data.name,
        addressLine1: parsed.data.addressLine1 ?? null,
        addressLine2: parsed.data.addressLine2 ?? null,
        city: parsed.data.city ?? null,
        stateRegion: parsed.data.stateRegion ?? null,
        postalCode: parsed.data.postalCode ?? null,
        country: parsed.data.country,
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
        timezone: parsed.data.timezone ?? null,
        status: parsed.data.status,
        notes: parsed.data.notes ?? null
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/viewer");
    revalidatePath("/sites");
    revalidatePath(`/sites/${siteId}`);
    revalidatePath("/devices");
    redirect(`/sites/${siteId}`);
  } catch (error) {
    const uniqueFields = getUniqueConstraintFields(error);

    if (uniqueFields.includes("organizationId") && uniqueFields.includes("name")) {
      return siteValidationError(
        {
          name: ["A site with this name already exists in the organization."]
        },
        "Choose a unique site name for this organization."
      );
    }

    return {
      status: "error",
      message: "Unable to update the site right now."
    };
  }
}
