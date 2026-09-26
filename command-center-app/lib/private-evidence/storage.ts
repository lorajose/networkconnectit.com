import {
  deletePrivateDesignAsset,
  readPrivateDesignAsset,
  storePrivateDesignAsset,
} from "@/lib/contractor-os/private-design-storage";

export type PrivateEvidenceObject = {
  body: Uint8Array;
  contentType: string;
  fileName: string;
};

export interface PrivateEvidenceStorage {
  put(storageKey: string, object: PrivateEvidenceObject): Promise<void>;
  get(storageKey: string): Promise<PrivateEvidenceObject | null>;
  remove(storageKey: string): Promise<void>;
}

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function assertConfigured() {
  const driver = (process.env.DESIGN_STORAGE_DRIVER ?? process.env.BID_STORAGE_DRIVER ?? "filesystem").trim().toLowerCase();
  if (driver === "filesystem") {
    if (!(process.env.DESIGN_PRIVATE_STORAGE_ROOT?.trim() || process.env.BID_PRIVATE_STORAGE_ROOT?.trim())) {
      throw new Error("Private evidence storage backend is not configured.");
    }
    return;
  }
  if (driver === "supabase") {
    const url = process.env.DESIGN_SUPABASE_URL?.trim() || process.env.BID_SUPABASE_URL?.trim();
    const key = process.env.DESIGN_SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.BID_SUPABASE_SERVICE_ROLE_KEY?.trim();
    const bucket = process.env.DESIGN_SUPABASE_BUCKET?.trim() || process.env.BID_SUPABASE_BUCKET?.trim();
    if (!url || !key || !bucket) throw new Error("Private evidence storage backend is not configured.");
    return;
  }
  throw new Error("Private evidence storage backend is not configured.");
}

function metadataFromKey(storageKey: string) {
  const storedName = storageKey.split("/").at(-1) ?? "";
  const separator = storedName.indexOf("--");
  const encodedName = separator >= 0 ? storedName.slice(separator + 2) : "";
  let fileName = "";
  try {
    fileName = decodeURIComponent(encodedName);
  } catch {
    fileName = "";
  }
  if (!fileName || fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
    throw new Error("Private evidence metadata is invalid.");
  }
  const extension = fileName.split(".").at(-1)?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) throw new Error("Private evidence metadata is invalid.");
  return { fileName, contentType };
}

export function privateEvidenceStorage(): PrivateEvidenceStorage {
  assertConfigured();
  return {
    async put(storageKey, object) {
      const metadata = metadataFromKey(storageKey);
      if (metadata.fileName !== object.fileName || metadata.contentType !== object.contentType) {
        throw new Error("Private evidence metadata does not match storage key.");
      }
      await storePrivateDesignAsset(storageKey, object.body);
    },
    async get(storageKey) {
      const metadata = metadataFromKey(storageKey);
      try {
        const body = await readPrivateDesignAsset(storageKey);
        return { body, ...metadata };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async remove(storageKey) {
      metadataFromKey(storageKey);
      await deletePrivateDesignAsset(storageKey);
    },
  };
}
