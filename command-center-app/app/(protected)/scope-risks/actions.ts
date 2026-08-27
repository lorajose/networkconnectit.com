"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { buildScopeRiskInput } from "@/lib/contractor-os/scope-risk-input";
import {
  createScopeRiskAnalysisRun,
  decideScopeRiskFinding,
  type ScopeRiskDecision,
} from "@/lib/contractor-os/scope-risk-repository";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function actor(user: Awaited<ReturnType<typeof requireUser>>) {
  return { role: user.role, organizationId: user.organizationId };
}

export async function runScopeRiskAnalysisAction(formData: FormData) {
  const user = await requireUser();
  const requestedOrganizationId = formString(formData, "organizationId");
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : requestedOrganizationId;
  if (!organizationId) throw new Error("Select an organization before running analysis");

  const links = {
    bidWorkspaceId: formString(formData, "bidWorkspaceId") || null,
    takeoffWorkspaceId: formString(formData, "takeoffWorkspaceId") || null,
    estimateId: formString(formData, "estimateId") || null,
    projectInstallationId: formString(formData, "projectInstallationId") || null,
  };
  if (!Object.values(links).some(Boolean)) {
    throw new Error("Link at least one Bid, Takeoff, Estimate, or Project source");
  }

  const analysis = await buildScopeRiskInput(actor(user), { organizationId, ...links });
  const result = await createScopeRiskAnalysisRun(actor(user), { organizationId, ...links, analysis });

  revalidatePath("/scope-risks");
  redirect(`/scope-risks?organizationId=${encodeURIComponent(organizationId)}&runId=${encodeURIComponent(result.runId)}`);
}

export async function decideScopeRiskFindingAction(formData: FormData) {
  const user = await requireUser();
  const organizationId = formString(formData, "organizationId");
  const runId = formString(formData, "runId");
  const decision = formString(formData, "decision") as ScopeRiskDecision;

  await decideScopeRiskFinding(
    { role: user.role, organizationId: user.organizationId, userId: user.id },
    {
      organizationId,
      findingId: formString(formData, "findingId"),
      decision,
      note: formString(formData, "note") || null,
    },
  );

  revalidatePath("/scope-risks");
  if (runId) revalidatePath(`/scope-risks?organizationId=${encodeURIComponent(organizationId)}&runId=${encodeURIComponent(runId)}`);
}
