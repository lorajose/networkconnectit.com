import {
  DeviceStatus,
  DeviceType,
  MonitoringMode
} from "@prisma/client";
import { z } from "zod";

import {
  optionalDate,
  optionalTrimmedString,
  requiredTrimmedString
} from "@/lib/validations/shared";

export const deviceStatusOptions = Object.values(DeviceStatus);
export const deviceTypeOptions = Object.values(DeviceType);
export const monitoringModeOptions = Object.values(MonitoringMode);

export const deviceFormSchema = z.object({
  organizationId: requiredTrimmedString(1, 191),
  siteId: requiredTrimmedString(1, 191),
  name: requiredTrimmedString(2, 191),
  type: z.nativeEnum(DeviceType),
  brand: requiredTrimmedString(1, 191),
  model: optionalTrimmedString(191),
  ipAddress: optionalTrimmedString(64),
  macAddress: optionalTrimmedString(64),
  serialNumber: optionalTrimmedString(191),
  status: z.nativeEnum(DeviceStatus),
  monitoringMode: z.nativeEnum(MonitoringMode),
  lastSeenAt: optionalDate(),
  notes: optionalTrimmedString(5000)
});

export type DeviceFormValues = z.infer<typeof deviceFormSchema>;
