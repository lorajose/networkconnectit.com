"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { createBidWorkspace } from "@/lib/contractor-os/bid-repository";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createBidAction(formData: FormData) {
  const user = await requireUser();
  const requestedOrganizationId = formString(formData, "organizationId");
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : requestedOrganizationId;

  if (!organizationId) {
    throw new Error("Select an organization before creating a bid");
  }

  await createBidWorkspace(
    { role: user.role, organizationId: user.organizationId },
    {
      organizationId,
      bidNumber: formString(formData, "bidNumber"),
      title: formString(formData, "title"),
      revision: formString(formData, "revision") || null,
      bidDueAt: formString(formData, "bidDueAt") || null,
      notes: formString(formData, "notes") || null,
      projectInstallationId: formString(formData, "projectInstallationId") || null,
      estimateId: formString(formData, "estimateId") || null,
    },
  );

  revalidatePath("/bids");
  redirect(`/bids?organizationId=${encodeURIComponent(organizationId)}`);
}
