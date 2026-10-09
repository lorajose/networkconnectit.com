"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { getSubscriptionExperienceSummaryForActor } from "@/lib/contractor-os/subscription-access-repository";
import { startOrganizationProTrialOnce } from "@/lib/contractor-os/subscription-trial-repository";

export async function startProTrialAction(): Promise<void> {
  const user = await requireUser();
  const organizationId = user.organizationId?.trim() ?? "";

  if (!organizationId) {
    throw new Error("An organization is required to start a Pro trial");
  }

  if (user.role !== "CLIENT_ADMIN") {
    throw new Error("Only an organization administrator can start the Pro trial");
  }

  const actor = { role: user.role, organizationId } as const;
  const current = await getSubscriptionExperienceSummaryForActor(actor);

  if (current.source === "SUBSCRIPTION") {
    redirect("/billing");
  }

  await startOrganizationProTrialOnce(organizationId);

  revalidatePath("/billing");
  revalidatePath("/dashboard");
  redirect("/billing");
}
