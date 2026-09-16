"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { updateOrganizationProfile } from "@/lib/contractor-os/organization-profile-repository";
import type { ManagementFormState } from "@/lib/management/form-state";
import { organizationProfileFormSchema } from "@/lib/validations/organization";

export async function updateOrganizationProfileAction(organizationId: string, _state: ManagementFormState, formData: FormData): Promise<ManagementFormState> {
  const user = await requireUser();
  const parsed = organizationProfileFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: "Review the highlighted organization profile fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await updateOrganizationProfile({ role: user.role, organizationId: user.organizationId }, organizationId, parsed.data);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { status: "error", message: "That organization slug is already in use." };
    return { status: "error", message: error instanceof Error ? error.message : "Unable to update organization profile." };
  }
  revalidatePath("/settings"); revalidatePath(`/organizations/${organizationId}`); revalidatePath(`/organizations/${organizationId}/edit`);
  return { status: "idle" };
}
