import { z } from "zod";

import { requiredTrimmedString } from "@/lib/validations/shared";

function csvText(maxLength: number) {
  return z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().max(maxLength)
  );
}

export const deviceImportCsvRowSchema = z.object({
  name: csvText(191),
  deviceType: csvText(64),
  brand: csvText(191),
  model: csvText(191),
  serialNumber: csvText(191),
  macAddress: csvText(64),
  hostname: csvText(191),
  ipAddress: csvText(64),
  firmwareVersion: csvText(191),
  projectInstallation: csvText(191),
  site: csvText(191),
  networkSegment: csvText(191),
  mountLocation: csvText(191),
  notes: csvText(5000),
  nvrDeviceReference: csvText(191),
  channelNumber: csvText(32),
  recordingEnabled: csvText(32)
});

export const deviceImportSubmissionSchema = z.object({
  organizationId: requiredTrimmedString(1, 191),
  rows: z.array(deviceImportCsvRowSchema).min(1),
  selectedRowNumbers: z.array(z.number().int().positive()).min(1)
});

export type DeviceImportCsvRowInput = z.infer<typeof deviceImportCsvRowSchema>;
export type DeviceImportSubmissionValues = z.infer<
  typeof deviceImportSubmissionSchema
>;
