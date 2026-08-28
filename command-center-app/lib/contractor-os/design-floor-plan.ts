import { createHash, randomUUID } from "node:crypto";
import { basename, extname } from "node:path";

export const DESIGN_FLOOR_PLAN_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export type DesignFloorPlanMimeType = (typeof DESIGN_FLOOR_PLAN_MIME_TYPES)[number];

export const DEFAULT_DESIGN_FLOOR_PLAN_MAX_BYTES = 50 * 1024 * 1024;
const MAX_FILE_NAME_LENGTH = 255;

export type DesignFloorPlanUpload = {
  fileName: string;
  mimeType: string;
  byteSize: number;
  bytes: Uint8Array;
};

export type ValidatedDesignFloorPlan = {
  assetId: string;
  originalName: string;
  mimeType: DesignFloorPlanMimeType;
  byteSize: number;
  sha256: string;
  extension: ".pdf" | ".jpg" | ".png";
};

function maxUploadBytes() {
  const configured = Number(process.env.DESIGN_FLOOR_PLAN_MAX_UPLOAD_BYTES ?? DEFAULT_DESIGN_FLOOR_PLAN_MAX_BYTES);
  return Number.isSafeInteger(configured) && configured > 0 ? configured : DEFAULT_DESIGN_FLOOR_PLAN_MAX_BYTES;
}

function detectMimeType(bytes: Uint8Array): DesignFloorPlanMimeType | null {
  if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") return "application/pdf";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value, index) => bytes[index] === value)) return "image/png";
  return null;
}

export function validateDesignFloorPlanUpload(input: DesignFloorPlanUpload): ValidatedDesignFloorPlan {
  const originalName = basename(input.fileName.trim());
  if (!originalName) throw new Error("Floor plan file name is required");
  if (originalName.length > MAX_FILE_NAME_LENGTH) throw new Error("Floor plan file name is too long");
  if (!Number.isSafeInteger(input.byteSize) || input.byteSize <= 0 || input.byteSize !== input.bytes.byteLength) throw new Error("Floor plan file size is invalid");
  if (input.byteSize > maxUploadBytes()) throw new Error("Floor plan file exceeds the upload limit");

  const detected = detectMimeType(input.bytes);
  if (!detected || !DESIGN_FLOOR_PLAN_MIME_TYPES.includes(input.mimeType as DesignFloorPlanMimeType) || detected !== input.mimeType) {
    throw new Error("Floor plan file type is not allowed or does not match its content");
  }

  const extension = detected === "application/pdf" ? ".pdf" : detected === "image/png" ? ".png" : ".jpg";
  const suppliedExtension = extname(originalName).toLowerCase();
  const allowedExtensions = detected === "image/jpeg" ? [".jpg", ".jpeg"] : [extension];
  if (!allowedExtensions.includes(suppliedExtension)) throw new Error("Floor plan file extension does not match its content");

  return {
    assetId: randomUUID(),
    originalName,
    mimeType: detected,
    byteSize: input.byteSize,
    sha256: createHash("sha256").update(input.bytes).digest("hex"),
    extension,
  };
}

export function designFloorPlanStorageKey(organizationId: string, projectId: string, assetId: string, extension: string) {
  for (const [label, value] of [["organization", organizationId], ["project", projectId], ["asset", assetId]] as const) {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error(`Invalid ${label} identifier for storage`);
  }
  if (![".pdf", ".jpg", ".png"].includes(extension)) throw new Error("Invalid floor plan storage extension");
  return `design-studio/${organizationId}/${projectId}/assets/${assetId}${extension}`;
}
