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

  // The acquisition trial is single-use. Any paid subscription, active trial,
  // or previously consumed/expired trial must never start a new trial.
  if (current.source !== "NONE") {
    redirect("/billing");
  }

  await startOrganizationProTrialOnce(organizationId);

  revalidatePath("/billing");
  revalidatePath("/dashboard");
  redirect("/billing");
}
