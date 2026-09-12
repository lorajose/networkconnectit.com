import type { AppRole } from "../rbac";

export const DEVICE_CATALOG_CATEGORIES = [
  "CAMERA",
  "NVR_DVR",
  "SWITCH",
  "ACCESS_CONTROL",
  "INTRUSION",
  "ACCESS_POINT",
  "ROUTER",
  "SERVER",
  "SENSOR",
  "OTHER",
] as const;

export type DeviceCatalogCategory = (typeof DEVICE_CATALOG_CATEGORIES)[number];
export type DeviceCatalogVisibility = "ORGANIZATION_PRIVATE" | "ENTERPRISE_SHARED";
export type DeviceCatalogActor = { role: AppRole; organizationId?: string | null; userId?: string | null };

export type DeviceRevisionInput = {
  manufacturer: string;
  model: string;
  category: DeviceCatalogCategory;
  revisionLabel?: string | null;
  widthMm?: number | null;
  heightMm?: number | null;
  depthMm?: number | null;
  weightKg?: number | null;
  powerInput?: string | null;
  maxPowerWatts?: number | null;
  poeRequired?: boolean | null;
  poeStandard?: string | null;
  poeClass?: string | null;
  ethernetSpeedMbps?: number | null;
  wirelessStandard?: string | null;
  networkNotes?: string | null;
  cameraResolutionMp?: number | null;
  lensMinMm?: number | null;
  lensMaxMm?: number | null;
  horizontalFovDegrees?: number | null;
  verticalFovDegrees?: number | null;
  irRangeMeters?: number | null;
  sensorSize?: string | null;
  videoCodecs?: string | null;
  technicalAttributes?: Record<string, unknown> | null;
  provenanceSource: string;
  provenanceUrl?: string | null;
  provenanceNotes?: string | null;
  effectiveFrom?: Date | string | null;
};

export type CreateDeviceCatalogItemInput = DeviceRevisionInput & {
  organizationId?: string | null;
  visibility: DeviceCatalogVisibility;
};

function requiredText(value: string, field: string, max = 191) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  if (normalized.length > max) throw new Error(`${field} is too long`);
  return normalized;
}

function optionalText(value: string | null | undefined, max = 191) {
  const normalized = value?.trim() || null;
  if (normalized && normalized.length > max) throw new Error("Catalog text value is too long");
  return normalized;
}

function nonNegative(value: number | null | undefined, field: string) {
  if (value == null) return null;
  if (!Number.isFinite(value) || value < 0) throw new Error(`${field} must be a non-negative number`);
  return value;
}

function bounded(value: number | null | undefined, field: string, max: number) {
  const normalized = nonNegative(value, field);
  if (normalized != null && normalized > max) throw new Error(`${field} is outside the supported range`);
  return normalized;
}

export function normalizeDeviceRevisionInput(input: DeviceRevisionInput): DeviceRevisionInput {
  if (!DEVICE_CATALOG_CATEGORIES.includes(input.category)) throw new Error("Device category is invalid");
  const lensMinMm = nonNegative(input.lensMinMm, "Lens minimum");
  const lensMaxMm = nonNegative(input.lensMaxMm, "Lens maximum");
  if (lensMinMm != null && lensMaxMm != null && lensMinMm > lensMaxMm) throw new Error("Lens minimum cannot exceed lens maximum");

  return {
    manufacturer: requiredText(input.manufacturer, "Manufacturer"),
    model: requiredText(input.model, "Model"),
    category: input.category,
    revisionLabel: optionalText(input.revisionLabel),
    widthMm: nonNegative(input.widthMm, "Width"),
    heightMm: nonNegative(input.heightMm, "Height"),
    depthMm: nonNegative(input.depthMm, "Depth"),
    weightKg: nonNegative(input.weightKg, "Weight"),
    powerInput: optionalText(input.powerInput),
    maxPowerWatts: nonNegative(input.maxPowerWatts, "Max power"),
    poeRequired: input.poeRequired ?? null,
    poeStandard: optionalText(input.poeStandard, 64),
    poeClass: optionalText(input.poeClass, 64),
    ethernetSpeedMbps: input.ethernetSpeedMbps == null ? null : Math.round(bounded(input.ethernetSpeedMbps, "Ethernet speed", 1_000_000) ?? 0),
    wirelessStandard: optionalText(input.wirelessStandard, 64),
    networkNotes: optionalText(input.networkNotes, 10_000),
    cameraResolutionMp: bounded(input.cameraResolutionMp, "Camera resolution", 1000),
    lensMinMm,
    lensMaxMm,
    horizontalFovDegrees: bounded(input.horizontalFovDegrees, "Horizontal FOV", 360),
    verticalFovDegrees: bounded(input.verticalFovDegrees, "Vertical FOV", 360),
    irRangeMeters: nonNegative(input.irRangeMeters, "IR range"),
    sensorSize: optionalText(input.sensorSize, 64),
    videoCodecs: optionalText(input.videoCodecs, 255),
    technicalAttributes: input.technicalAttributes ?? null,
    provenanceSource: requiredText(input.provenanceSource, "Provenance source"),
    provenanceUrl: optionalText(input.provenanceUrl, 500),
    provenanceNotes: optionalText(input.provenanceNotes, 10_000),
    effectiveFrom: input.effectiveFrom ?? null,
  };
}

export function catalogReadOrganizationId(actor: DeviceCatalogActor, requestedOrganizationId?: string | null) {
  if (actor.role === "CLIENT_ADMIN" || actor.role === "VIEWER") {
    if (!actor.organizationId) throw new Error("Tenant-scoped actor is missing organizationId");
    if (requestedOrganizationId && requestedOrganizationId !== actor.organizationId) throw new Error("Cross-tenant catalog read denied");
    return actor.organizationId;
  }
  if (!requestedOrganizationId) throw new Error("Admin catalog reads must select an organization");
  return requestedOrganizationId;
}

export function requireCatalogWriteScope(actor: DeviceCatalogActor, visibility: DeviceCatalogVisibility, requestedOrganizationId?: string | null) {
  if (actor.role === "VIEWER") throw new Error("VIEWER cannot modify device catalog records");
  if (visibility === "ENTERPRISE_SHARED") {
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "INTERNAL_ADMIN") throw new Error("Only internal admins can publish enterprise-shared catalog devices");
    return null;
  }
  const organizationId = requestedOrganizationId?.trim() || actor.organizationId?.trim() || null;
  if (!organizationId) throw new Error("Organization is required for a private catalog device");
  if (actor.role === "CLIENT_ADMIN" && actor.organizationId !== organizationId) throw new Error("Cross-tenant catalog write denied");
  return organizationId;
}
