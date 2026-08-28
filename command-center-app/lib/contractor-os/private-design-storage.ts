import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

function storageRoot() {
  const configured = process.env.DESIGN_PRIVATE_STORAGE_ROOT?.trim() || process.env.BID_PRIVATE_STORAGE_ROOT?.trim();
  if (!configured) throw new Error("DESIGN_PRIVATE_STORAGE_ROOT (or BID_PRIVATE_STORAGE_ROOT fallback) is not configured");
  if (!path.isAbsolute(configured)) throw new Error("Design private storage root must be an absolute path");

  const resolved = path.resolve(configured);
  const publicDir = path.resolve(process.cwd(), "public");
  if (resolved === publicDir || resolved.startsWith(`${publicDir}${path.sep}`)) {
    throw new Error("Private design storage cannot be inside the public directory");
  }
  return resolved;
}

function resolveStorageKey(storageKey: string) {
  const root = storageRoot();
  const normalized = storageKey.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Private design storage key is invalid");
  }
  const absolute = path.resolve(root, ...normalized.split("/"));
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
    throw new Error("Private design storage key escapes configured storage root");
  }
  return absolute;
}

export async function storePrivateDesignAsset(storageKey: string, bytes: Uint8Array) {
  if (!bytes.byteLength) throw new Error("Design asset is empty");
  const absolute = resolveStorageKey(storageKey);
  await mkdir(path.dirname(absolute), { recursive: true, mode: 0o700 });
  await writeFile(absolute, bytes, { mode: 0o600, flag: "wx" });
}

export async function readPrivateDesignAsset(storageKey: string) {
  return readFile(resolveStorageKey(storageKey));
}

export async function deletePrivateDesignAsset(storageKey: string) {
  try {
    await unlink(resolveStorageKey(storageKey));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
