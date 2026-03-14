import {
  DeviceStatus,
  DeviceType,
  MonitoringMode
} from "@prisma/client";
import { z } from "zod";

import {
  optionalDate,
  optionalInteger,
  optionalNumber,
  optionalTrimmedString,
  requiredTrimmedString
} from "@/lib/validations/shared";

export const deviceStatusOptions = Object.values(DeviceStatus);
export const deviceTypeOptions = Object.values(DeviceType);
export const monitoringModeOptions = Object.values(MonitoringMode);
export const switchRoleOptions = [
  "CORE",
  "DISTRIBUTION",
  "ACCESS",
  "AGGREGATION",
  "OTHER"
] as const;

const optionalBooleanChoice = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  return value;
}, z.boolean().optional());

const optionalSwitchRole = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return value;
}, z.enum(switchRoleOptions).optional());

export const deviceFormSchema = z.object({
  organizationId: requiredTrimmedString(1, 191),
  siteId: requiredTrimmedString(1, 191),
  projectInstallationId: optionalTrimmedString(191),
  networkSegmentId: optionalTrimmedString(191),
  name: requiredTrimmedString(2, 191),
  hostname: optionalTrimmedString(191),
  type: z.nativeEnum(DeviceType),
  brand: requiredTrimmedString(1, 191),
  model: optionalTrimmedString(191),
  firmwareVersion: optionalTrimmedString(191),
  vendorExternalId: optionalTrimmedString(191),
  ipAddress: optionalTrimmedString(64),
  macAddress: optionalTrimmedString(64),
  serialNumber: optionalTrimmedString(191),
  switchRole: optionalSwitchRole,
  portCount: optionalInteger(1, 512),
  usedPortCount: optionalInteger(0, 512),
  poeBudgetWatts: optionalNumber().refine(
    (value) => value === undefined || value >= 0,
    "PoE budget must be zero or greater."
  ),
  poeUsedWatts: optionalNumber().refine(
    (value) => value === undefined || value >= 0,
    "PoE usage must be zero or greater."
  ),
  poeRequired: optionalBooleanChoice,
  estimatedPoeWatts: optionalNumber().refine(
    (value) => value === undefined || value >= 0,
    "Estimated PoE draw must be zero or greater."
  ),
  status: z.nativeEnum(DeviceStatus),
  monitoringMode: z.nativeEnum(MonitoringMode),
  installedAt: optionalDate(),
  lastSeenAt: optionalDate(),
  notes: optionalTrimmedString(5000)
});

export type DeviceFormValues = z.infer<typeof deviceFormSchema>;
