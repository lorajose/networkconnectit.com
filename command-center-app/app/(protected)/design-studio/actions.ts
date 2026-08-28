"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRoles } from "@/lib/auth";
import { persistFloorPlanAssetAndAttach } from "@/lib/contractor-os/design-asset-repository";
import type { CanvasDocument } from "@/lib/contractor-os/design-canvas-state";
import { designFloorPlanStorageKey, validateDesignFloorPlanUpload } from "@/lib/contractor-os/design-floor-plan";
import { createDesignFloor, createDesignProject, saveDesignFloorCanvas } from "@/lib/contractor-os/design-studio-repository";
import { createDesignVersionCheckpoint, getDesignVersionSnapshot, restoreDesignVersion } from "@/lib/contractor-os/design-version-repository";
import { deletePrivateDesignAsset, storePrivateDesignAsset } from "@/lib/contractor-os/private-design-storage";
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

export async function uploadDesignFloorPlanAction(formData: FormData): Promise<void> {
  const user = await requireRoles(routeAccess.designStudio);
  const requestedOrganizationId = formString(formData, "organizationId");
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : requestedOrganizationId;
  const projectId = formString(formData, "projectId");
  const floorId = formString(formData, "floorId");
  const uploaded = formData.get("file");

  if (!organizationId || !projectId || !floorId) throw new Error("Organization, project and floor are required");
  if (!(uploaded instanceof File) || !uploaded.name) throw new Error("Select a PDF, JPG or PNG floor plan");

  const bytes = new Uint8Array(await uploaded.arrayBuffer());
  const asset = validateDesignFloorPlanUpload({
    fileName: uploaded.name,
    mimeType: uploaded.type.toLowerCase(),
    byteSize: bytes.byteLength,
    bytes,
  });
  const storageKey = designFloorPlanStorageKey(organizationId, projectId, asset.assetId, asset.extension);

  await storePrivateDesignAsset(storageKey, bytes);
  try {
    await persistFloorPlanAssetAndAttach(
      { role: user.role, organizationId: user.organizationId },
      { organizationId, projectId, floorId, storageKey, asset, createdByUserId: user.id },
    );
  } catch (error) {
    await deletePrivateDesignAsset(storageKey);
    throw error;
  }

  revalidatePath(`/design-studio/${projectId}`);
}

export async function saveDesignCanvasAction(input: {
  organizationId: string;
  projectId: string;
  floorId: string;
  expectedRevision: number;
  document: CanvasDocument;
}) {
  const user = await requireRoles(routeAccess.designStudio);
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : input.organizationId.trim();
  if (!organizationId) throw new Error("Organization context is required");
  const nextRevision = await saveDesignFloorCanvas(
    { role: user.role, organizationId: user.organizationId },
    { ...input, organizationId },
  );
  revalidatePath(`/design-studio/${input.projectId}`);
  return { revision: nextRevision };
}

export async function createDesignCheckpointAction(input: {
  organizationId: string;
  projectId: string;
  expectedRevision: number;
  reason?: string | null;
}) {
  const user = await requireRoles(routeAccess.designStudio);
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : input.organizationId.trim();
  if (!organizationId) throw new Error("Organization context is required");
  const version = await createDesignVersionCheckpoint(
    { role: user.role, organizationId: user.organizationId },
    { ...input, organizationId, createdByUserId: user.id },
  );
  revalidatePath(`/design-studio/${input.projectId}`);
  return version;
}

export async function getDesignVersionPreviewAction(input: {
  organizationId: string;
  projectId: string;
  versionId: string;
}) {
  const user = await requireRoles(routeAccess.designStudio);
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : input.organizationId.trim();
  if (!organizationId) throw new Error("Organization context is required");
  return getDesignVersionSnapshot(
    { role: user.role, organizationId: user.organizationId },
    input.projectId,
    input.versionId,
    organizationId,
  );
}

export async function restoreDesignVersionAction(input: {
  organizationId: string;
  projectId: string;
  versionId: string;
  expectedRevision: number;
}) {
  const user = await requireRoles(routeAccess.designStudio);
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : input.organizationId.trim();
  if (!organizationId) throw new Error("Organization context is required");
  const revision = await restoreDesignVersion(
    { role: user.role, organizationId: user.organizationId },
    { ...input, organizationId },
  );
  revalidatePath(`/design-studio/${input.projectId}`);
  return { revision };
}
