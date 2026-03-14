"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  type ManagementFormState
} from "@/lib/management/form-state";
import { getUniqueConstraintFields } from "@/lib/management/prisma-errors";
import { requireOrganizationManagementAccess } from "@/lib/management/tenant";
import { organizationFormSchema } from "@/lib/validations/organization";

function getOrganizationFormValues(formData: FormData) {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    phone: formData.get("phone"),
    status: formData.get("status")
  };
}

function organizationValidationError(
  fieldErrors: Record<string, string[] | undefined>,
  message = "Review the highlighted fields and try again."
): ManagementFormState {
  return {
    status: "error",
    message,
    fieldErrors
  };
}

export async function createOrganizationAction(
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireOrganizationManagementAccess(await requireUser());
  const parsed = organizationFormSchema.safeParse(getOrganizationFormValues(formData));

  if (!parsed.success) {
    return organizationValidationError(parsed.error.flatten().fieldErrors);
  }

  let organizationId: string;

  try {
    const organization = await prisma.organization.create({
      data: {
        name: parsed.data.name.trim(),
        slug: parsed.data.slug.trim().toLowerCase(),
        contactName: parsed.data.contactName ?? null,
        contactEmail: parsed.data.contactEmail?.toLowerCase() ?? null,
        phone: parsed.data.phone ?? null,
        status: parsed.data.status
      }
    });
    organizationId = organization.id;

    revalidatePath("/dashboard");
    revalidatePath("/organizations");
    revalidatePath("/sites");
    revalidatePath("/devices");
  } catch (error) {
    const uniqueFields = getUniqueConstraintFields(error);

    if (uniqueFields.includes("slug")) {
      return organizationValidationError(
        {
          slug: ["This slug is already in use."]
        },
        "Choose a different slug to continue."
      );
    }

    return {
      status: "error",
      message: "Unable to save the organization right now."
    };
  }

  redirect(`/organizations/${organizationId}`);
}

export async function updateOrganizationAction(
  organizationId: string,
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireOrganizationManagementAccess(await requireUser());
  const parsed = organizationFormSchema.safeParse(getOrganizationFormValues(formData));

  if (!parsed.success) {
    return organizationValidationError(parsed.error.flatten().fieldErrors);
  }

  const existingOrganization = await prisma.organization.findFirst({
    where: {
      id: organizationId
    },
    select: {
      id: true
    }
  });

  if (!existingOrganization) {
    return {
      status: "error",
      message: "The organization could not be found."
    };
  }

  try {
    await prisma.organization.update({
      where: {
        id: organizationId
      },
      data: {
        name: parsed.data.name.trim(),
        slug: parsed.data.slug.trim().toLowerCase(),
        contactName: parsed.data.contactName ?? null,
        contactEmail: parsed.data.contactEmail?.toLowerCase() ?? null,
        phone: parsed.data.phone ?? null,
        status: parsed.data.status
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/organizations");
    revalidatePath(`/organizations/${organizationId}`);
    revalidatePath("/sites");
    revalidatePath("/devices");
  } catch (error) {
    const uniqueFields = getUniqueConstraintFields(error);

    if (uniqueFields.includes("slug")) {
      return organizationValidationError(
        {
          slug: ["This slug is already in use."]
        },
        "Choose a different slug to continue."
      );
    }

    return {
      status: "error",
      message: "Unable to update the organization right now."
    };
  }

  redirect(`/organizations/${organizationId}`);
}
