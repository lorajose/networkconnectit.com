"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRoles } from "@/lib/auth";
import { createDesignFloor, createDesignProject } from "@/lib/contractor-os/design-studio-repository";
import { routeAccess } from "@/lib/rbac";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createDesignProjectAction(formData: FormData) {
  const user = await requireRoles(routeAccess.designStudio);
  const requestedOrganizationId = formString(formData, "organizationId");
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : requestedOrganizationId;
  if (!organizationId) throw new Error("Select an organization before creating a design project");

  const projectId = await createDesignProject(
    { role: user.role, organizationId: user.organizationId },
    { organizationId, name: formString(formData, "name"), createdByUserId: user.id },
  );

  const floorName = formString(formData, "floorName") || "Level 1";
  await createDesignFloor(
    { role: user.role, organizationId: user.organizationId },
    { organizationId, projectId, name: floorName, levelOrder: 0 },
  );

  revalidatePath("/design-studio");
  redirect(`/design-studio/${projectId}?organizationId=${encodeURIComponent(organizationId)}`);
}
