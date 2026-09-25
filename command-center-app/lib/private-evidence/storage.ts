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

export function privateEvidenceStorage(): PrivateEvidenceStorage {
  throw new Error("Private evidence storage backend is not configured.");
}
