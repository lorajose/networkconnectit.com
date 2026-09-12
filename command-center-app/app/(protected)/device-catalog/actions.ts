"use server";

import { revalidatePath } from "next/cache";

import { requireRoles } from "@/lib/auth";
import { createDeviceCatalogItem, createDeviceCatalogRevision } from "@/lib/contractor-os/device-catalog-repository";
import type { DeviceCatalogCategory, DeviceCatalogVisibility } from "@/lib/contractor-os/device-catalog";
import { routeAccess } from "@/lib/rbac";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalNumber(formData: FormData, key: string) {
  const value = formString(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${key} must be numeric`);
  return parsed;
}

function booleanOrNull(formData: FormData, key: string) {
  const value = formString(formData, key);
  if (!value) return null;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${key} must be true or false`);
}

function actorFromUser(user: Awaited<ReturnType<typeof requireRoles>>) {
  return { role: user.role, organizationId: user.organizationId, userId: user.id };
}

function revisionInput(formData: FormData) {
  return {
    manufacturer: formString(formData, "manufacturer"),
    model: formString(formData, "model"),
    category: formString(formData, "category") as DeviceCatalogCategory,
    revisionLabel: formString(formData, "revisionLabel") || null,
    widthMm: optionalNumber(formData, "widthMm"),
    heightMm: optionalNumber(formData, "heightMm"),
    depthMm: optionalNumber(formData, "depthMm"),
    weightKg: optionalNumber(formData, "weightKg"),
    powerInput: formString(formData, "powerInput") || null,
    maxPowerWatts: optionalNumber(formData, "maxPowerWatts"),
    poeRequired: booleanOrNull(formData, "poeRequired"),
    poeStandard: formString(formData, "poeStandard") || null,
    poeClass: formString(formData, "poeClass") || null,
    ethernetSpeedMbps: optionalNumber(formData, "ethernetSpeedMbps"),
    wirelessStandard: formString(formData, "wirelessStandard") || null,
    networkNotes: formString(formData, "networkNotes") || null,
    cameraResolutionMp: optionalNumber(formData, "cameraResolutionMp"),
    lensMinMm: optionalNumber(formData, "lensMinMm"),
    lensMaxMm: optionalNumber(formData, "lensMaxMm"),
    horizontalFovDegrees: optionalNumber(formData, "horizontalFovDegrees"),
    verticalFovDegrees: optionalNumber(formData, "verticalFovDegrees"),
    irRangeMeters: optionalNumber(formData, "irRangeMeters"),
    sensorSize: formString(formData, "sensorSize") || null,
    videoCodecs: formString(formData, "videoCodecs") || null,
    provenanceSource: formString(formData, "provenanceSource"),
    provenanceUrl: formString(formData, "provenanceUrl") || null,
    provenanceNotes: formString(formData, "provenanceNotes") || null,
  };
}

export async function createDeviceCatalogItemAction(formData: FormData) {
  const user = await requireRoles(routeAccess.deviceCatalog);
  const requestedOrganizationId = formString(formData, "organizationId") || null;
  const visibility = formString(formData, "visibility") as DeviceCatalogVisibility;
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? null : requestedOrganizationId;

  await createDeviceCatalogItem(actorFromUser(user), {
    ...revisionInput(formData),
    visibility,
    organizationId,
  });

  revalidatePath("/device-catalog");
}

export async function createDeviceCatalogRevisionAction(formData: FormData) {
  const user = await requireRoles(routeAccess.deviceCatalog);
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? null : formString(formData, "organizationId") || null;
  const catalogItemId = formString(formData, "catalogItemId");
  if (!catalogItemId) throw new Error("Catalog item is required");

  await createDeviceCatalogRevision(actorFromUser(user), catalogItemId, organizationId, revisionInput(formData));
  revalidatePath("/device-catalog");
}
