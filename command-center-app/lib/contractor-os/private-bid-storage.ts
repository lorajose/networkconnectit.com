import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function storageRoot() {
  const configured = process.env.BID_PRIVATE_STORAGE_ROOT?.trim();
  if (!configured) {
    throw new Error("BID_PRIVATE_STORAGE_ROOT is not configured");
  }
  if (!path.isAbsolute(configured)) {
    throw new Error("BID_PRIVATE_STORAGE_ROOT must be an absolute path");
  }

  const resolved = path.resolve(configured);
  const publicDir = path.resolve(process.cwd(), "public");
  if (resolved === publicDir || resolved.startsWith(`${publicDir}${path.sep}`)) {
    throw new Error("Private bid storage cannot be inside the public directory");
  }
  return resolved;
}

function maxUploadBytes() {
  const configured = Number(process.env.BID_MAX_UPLOAD_BYTES ?? DEFAULT_MAX_UPLOAD_BYTES);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_MAX_UPLOAD_BYTES;
}

function safeSegment(value: string) {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!cleaned || cleaned === "." || cleaned === "..") throw new Error("Invalid storage path segment");
  return cleaned;
}

function safeFileName(value: string) {
  const base = path.basename(value.trim()).replace(/[^a-zA-Z0-9._ -]/g, "_");
  if (!base) throw new Error("Uploaded file name is invalid");
  return base.slice(0, 180);
}

function resolveSourceKey(sourceKey: string) {
  const root = storageRoot();
  const normalized = sourceKey.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Private storage key is invalid");
  }

  const absolute = path.resolve(root, ...normalized.split("/"));
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
    throw new Error("Private storage key escapes configured storage root");
  }
  return absolute;
}

export type StoredBidFile = {
  sourceKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export async function storePrivateBidFile(input: {
  organizationId: string;
  bidWorkspaceId: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<StoredBidFile> {
  const fileName = safeFileName(input.fileName);
  const mimeType = input.mimeType.trim().toLowerCase() || "application/octet-stream";
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported bid document type: ${mimeType}`);
  }
  if (input.bytes.byteLength <= 0) throw new Error("Uploaded file is empty");
  if (input.bytes.byteLength > maxUploadBytes()) throw new Error("Uploaded file exceeds the configured size limit");

  const organizationId = safeSegment(input.organizationId);
  const bidWorkspaceId = safeSegment(input.bidWorkspaceId);
  const storedName = `${randomUUID()}-${fileName}`;
  const sourceKey = `${organizationId}/bids/${bidWorkspaceId}/${storedName}`;
  const absolute = resolveSourceKey(sourceKey);

  await mkdir(path.dirname(absolute), { recursive: true, mode: 0o700 });
  await writeFile(absolute, input.bytes, { mode: 0o600, flag: "wx" });

  return { sourceKey, fileName, mimeType, sizeBytes: input.bytes.byteLength };
}

export async function readPrivateBidFile(sourceKey: string) {
  return readFile(resolveSourceKey(sourceKey));
}

export async function deletePrivateBidFile(sourceKey: string) {
  try {
    await unlink(resolveSourceKey(sourceKey));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }
}
