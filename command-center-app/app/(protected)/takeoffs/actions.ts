"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import {
  addTakeoffItem,
  createTakeoffWorkspace,
  deleteTakeoffItem,
  updateBomOverride,
  updateTakeoffItemQuantity,
} from "@/lib/contractor-os/takeoff-repository";
import type { TakeoffCategory, TakeoffSource } from "@/lib/contractor-os/takeoff";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalNumber(formData: FormData, key: string) {
  const raw = formString(formData, key);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${key} must be a number`);
  return value;
}

function actor(user: Awaited<ReturnType<typeof requireUser>>) {
  return { role: user.role, organizationId: user.organizationId };
}

export async function createTakeoffWorkspaceAction(formData: FormData) {
  const user = await requireUser();
  const requestedOrganizationId = formString(formData, "organizationId");
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : requestedOrganizationId;
  if (!organizationId) throw new Error("Select an organization before creating a takeoff");

  const workspaceId = await createTakeoffWorkspace(actor(user), {
    organizationId,
    name: formString(formData, "name"),
    bidWorkspaceId: formString(formData, "bidWorkspaceId") || null,
    estimateId: formString(formData, "estimateId") || null,
    notes: formString(formData, "notes") || null,
  });

  revalidatePath("/takeoffs");
  redirect(`/takeoffs/${workspaceId}?organizationId=${encodeURIComponent(organizationId)}`);
}

export async function addTakeoffItemAction(formData: FormData) {
  const user = await requireUser();
  const organizationId = formString(formData, "organizationId");
  const workspaceId = formString(formData, "workspaceId");
  const countedQuantity = optionalNumber(formData, "countedQuantity");
  if (countedQuantity == null) throw new Error("Counted quantity is required");

  await addTakeoffItem(actor(user), organizationId, workspaceId, {
    category: formString(formData, "category") as TakeoffCategory,
    itemCode: formString(formData, "itemCode") || null,
    description: formString(formData, "description"),
    unit: formString(formData, "unit") || "EA",
    countedQuantity,
    overrideQuantity: optionalNumber(formData, "overrideQuantity"),
    sheetReference: formString(formData, "sheetReference") || null,
    drawingRevision: formString(formData, "drawingRevision") || null,
    notes: formString(formData, "notes") || null,
    source: (formString(formData, "source") || "MANUAL") as TakeoffSource,
  });

  revalidatePath(`/takeoffs/${workspaceId}`);
  revalidatePath("/takeoffs");
}

export async function updateTakeoffItemQuantityAction(formData: FormData) {
  const user = await requireUser();
  const organizationId = formString(formData, "organizationId");
  const workspaceId = formString(formData, "workspaceId");
  await updateTakeoffItemQuantity(actor(user), {
    organizationId,
    workspaceId,
    itemId: formString(formData, "itemId"),
    overrideQuantity: optionalNumber(formData, "overrideQuantity"),
  });
  revalidatePath(`/takeoffs/${workspaceId}`);
}

export async function updateBomOverrideAction(formData: FormData) {
  const user = await requireUser();
  const organizationId = formString(formData, "organizationId");
  const workspaceId = formString(formData, "workspaceId");
  await updateBomOverride(actor(user), {
    organizationId,
    workspaceId,
    bomItemId: formString(formData, "bomItemId"),
    overrideQuantity: optionalNumber(formData, "overrideQuantity"),
  });
  revalidatePath(`/takeoffs/${workspaceId}`);
}

export async function deleteTakeoffItemAction(formData: FormData) {
  const user = await requireUser();
  const organizationId = formString(formData, "organizationId");
  const workspaceId = formString(formData, "workspaceId");
  await deleteTakeoffItem(actor(user), organizationId, workspaceId, formString(formData, "itemId"));
  revalidatePath(`/takeoffs/${workspaceId}`);
  revalidatePath("/takeoffs");
}
