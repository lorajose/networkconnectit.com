"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRoles } from "@/lib/auth";
import { createSurveyAssignment, startSurveySession } from "@/lib/contractor-os/site-survey-repository";
import { parseSurveyDisciplines } from "@/lib/contractor-os/site-survey";
import { routeAccess } from "@/lib/rbac";

function value(formData: FormData, key: string) {
  const item = formData.get(key);
  return typeof item === "string" ? item.trim() : "";
}

export async function createSurveyAssignmentAction(formData: FormData) {
  const user = await requireRoles(routeAccess.siteSurveys);
  const requestedOrganizationId = value(formData, "organizationId");
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : requestedOrganizationId;
  if (!organizationId) throw new Error("Organization context is required");

  await createSurveyAssignment(
    { role: user.role, organizationId: user.organizationId },
    {
      organizationId,
      projectInstallationId: value(formData, "projectInstallationId"),
      siteId: value(formData, "siteId"),
      title: value(formData, "title"),
      disciplines: parseSurveyDisciplines(formData.getAll("disciplines").filter((v): v is string => typeof v === "string")),
      assignedToUserId: value(formData, "assignedToUserId") || null,
      assignedByUserId: user.id,
      instructions: value(formData, "instructions") || null,
    },
  );
  revalidatePath("/site-surveys");
  redirect(`/site-surveys?organizationId=${encodeURIComponent(organizationId)}`);
}

export async function startSurveySessionAction(formData: FormData) {
  const user = await requireRoles(routeAccess.siteSurveys);
  const requestedOrganizationId = value(formData, "organizationId");
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : requestedOrganizationId;
  if (!organizationId) throw new Error("Organization context is required");
  await startSurveySession(
    { role: user.role, organizationId: user.organizationId },
    { organizationId, assignmentId: value(formData, "assignmentId"), technicianUserId: user.id },
  );
  revalidatePath("/site-surveys");
}
