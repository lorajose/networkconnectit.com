import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

type DesignStorageDriver = "filesystem" | "supabase";

function storageDriver(): DesignStorageDriver {
  const configured = (process.env.DESIGN_STORAGE_DRIVER ?? process.env.BID_STORAGE_DRIVER)?.trim().toLowerCase();
  if (!configured || configured === "filesystem") return "filesystem";
  if (configured === "supabase") return "supabase";
  throw new Error(`Unsupported DESIGN_STORAGE_DRIVER: ${configured}`);
}

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

function normalizeStorageKey(storageKey: string) {
  const normalized = storageKey.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Private design storage key is invalid");
  }
  return normalized;
}

function resolveStorageKey(storageKey: string) {
  const root = storageRoot();
  const normalized = normalizeStorageKey(storageKey);
  const absolute = path.resolve(root, ...normalized.split("/"));
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
    throw new Error("Private design storage key escapes configured storage root");
  }
  return absolute;
}

function safeBucket(value: string) {
  const bucket = value.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!bucket || bucket === "." || bucket === "..") throw new Error("Invalid design storage bucket");
  return bucket;
}

function supabaseConfig() {
  const url = (process.env.DESIGN_SUPABASE_URL ?? process.env.BID_SUPABASE_URL)?.trim().replace(/\/+$/, "");
  const serviceRoleKey = (process.env.DESIGN_SUPABASE_SERVICE_ROLE_KEY ?? process.env.BID_SUPABASE_SERVICE_ROLE_KEY)?.trim();
  const bucketValue = (process.env.DESIGN_SUPABASE_BUCKET ?? process.env.BID_SUPABASE_BUCKET)?.trim();
  if (!url) throw new Error("DESIGN_SUPABASE_URL (or BID_SUPABASE_URL fallback) is not configured");
  if (!serviceRoleKey) throw new Error("DESIGN_SUPABASE_SERVICE_ROLE_KEY (or BID_SUPABASE_SERVICE_ROLE_KEY fallback) is not configured");
  if (!bucketValue) throw new Error("DESIGN_SUPABASE_BUCKET (or BID_SUPABASE_BUCKET fallback) is not configured");
  return { url, serviceRoleKey, bucket: safeBucket(bucketValue) };
}

function encodedStoragePath(storageKey: string) {
  return normalizeStorageKey(storageKey).split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

function supabaseHeaders(contentType?: string) {
  const { serviceRoleKey } = supabaseConfig();
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

async function storeSupabaseAsset(storageKey: string, bytes: Uint8Array) {
  const { url, bucket } = supabaseConfig();
  const response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedStoragePath(storageKey)}`, {
    method: "POST",
    headers: { ...supabaseHeaders("application/octet-stream"), "x-upsert": "false" },
    body: Buffer.from(bytes),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Private design upload failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`);
  }
}

async function readSupabaseAsset(storageKey: string) {
  const { url, bucket } = supabaseConfig();
  const response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedStoragePath(storageKey)}`, {
    method: "GET",
    headers: supabaseHeaders(),
  });
  if (!response.ok) throw new Error(`Private design download failed (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

async function deleteSupabaseAsset(storageKey: string) {
  const { url, bucket } = supabaseConfig();
  const response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}`, {
    method: "DELETE",
    headers: supabaseHeaders("application/json"),
    body: JSON.stringify({ prefixes: [normalizeStorageKey(storageKey)] }),
  });
  if (!response.ok && response.status !== 404) throw new Error(`Private design delete failed (${response.status})`);
}

export async function storePrivateDesignAsset(storageKey: string, bytes: Uint8Array) {
  if (!bytes.byteLength) throw new Error("Design asset is empty");
  if (storageDriver() === "supabase") {
    await storeSupabaseAsset(storageKey, bytes);
    return;
  }
  const absolute = resolveStorageKey(storageKey);
  await mkdir(path.dirname(absolute), { recursive: true, mode: 0o700 });
  await writeFile(absolute, bytes, { mode: 0o600, flag: "wx" });
}

export async function readPrivateDesignAsset(storageKey: string) {
  if (storageDriver() === "supabase") return readSupabaseAsset(storageKey);
  return readFile(resolveStorageKey(storageKey));
}

export async function deletePrivateDesignAsset(storageKey: string) {
  if (storageDriver() === "supabase") {
    await deleteSupabaseAsset(storageKey);
    return;
  }
  try {
    await unlink(resolveStorageKey(storageKey));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
