import { createHash } from "node:crypto";

import type { ProposalDocument } from "./proposal";

export const PROFESSIONAL_PDF_STRATEGY = "CONTROLLED_SERVER_HTML_TO_PDF" as const;
export const PROFESSIONAL_DOCUMENT_SCHEMA_VERSION = 1 as const;

export type ProfessionalDocumentKind = "PROPOSAL" | "CLOSEOUT";
export type ProfessionalDocumentAudience =
  | "CUSTOMER_COPY"
  | "CONTRACTOR_CLOSEOUT"
  | "INTERNAL_OPERATIONS";

export type ProfessionalDocumentBranding = {
  companyName: string;
  logoUrl?: string | null;
  brandTagline?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type ProfessionalDocumentMetadata = {
  documentNumber: string;
  title: string;
  sourceVersion: number;
  generatedAtIso: string;
};

export type ProfessionalDocumentSnapshot<T = unknown> = {
  schemaVersion: typeof PROFESSIONAL_DOCUMENT_SCHEMA_VERSION;
  strategy: typeof PROFESSIONAL_PDF_STRATEGY;
  kind: ProfessionalDocumentKind;
  audience: ProfessionalDocumentAudience;
  branding: ProfessionalDocumentBranding;
  metadata: ProfessionalDocumentMetadata;
  payload: T;
  snapshotHash: string;
};

const CUSTOMER_COPY_REDACTED_KEYS = new Set([
  "internalProjectManager",
  "leadTechnician",
  "salesOwner",
  "remoteAccessMethod",
  "vaultPath",
  "gatewayIp",
  "sourcePort",
  "targetPort",
  "devicePortNotes",
  "accessReference",
  "accessReferences",
]);

const SECRET_KEYS = /password|secret|token|authorization|cookie|privateKey|credential/i;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => [key, canonicalize(nested)])
  );
}

export function canonicalProfessionalDocumentJson(value: unknown) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value: unknown) {
  return createHash("sha256")
    .update(canonicalProfessionalDocumentJson(value))
    .digest("hex");
}

export function applyProfessionalDocumentAudiencePolicy(
  value: unknown,
  audience: ProfessionalDocumentAudience
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => applyProfessionalDocumentAudiencePolicy(item, audience));
  }
  if (!value || typeof value !== "object") return value;

  const safeEntries: Array<[string, unknown]> = [];
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEYS.test(key)) continue;

    if (audience === "CUSTOMER_COPY" && CUSTOMER_COPY_REDACTED_KEYS.has(key)) {
      if (key === "accessReferences") safeEntries.push([key, []]);
      else if (key === "remoteAccessMethod" || key === "gatewayIp" || key === "sourcePort" || key === "targetPort") safeEntries.push([key, null]);
      continue;
    }

    if (audience === "CUSTOMER_COPY" && key === "subnetCidr") {
      safeEntries.push([key, "Redacted"]);
      continue;
    }

    safeEntries.push([
      key,
      applyProfessionalDocumentAudiencePolicy(nested, audience),
    ]);
  }

  return Object.fromEntries(safeEntries);
}

function buildSnapshot<T>(input: {
  kind: ProfessionalDocumentKind;
  audience: ProfessionalDocumentAudience;
  branding: ProfessionalDocumentBranding;
  metadata: ProfessionalDocumentMetadata;
  payload: T;
}): ProfessionalDocumentSnapshot<T> {
  if (!input.branding.companyName.trim()) throw new Error("branding.companyName is required");
  if (!input.metadata.documentNumber.trim()) throw new Error("metadata.documentNumber is required");
  if (!input.metadata.title.trim()) throw new Error("metadata.title is required");
  if (!Number.isInteger(input.metadata.sourceVersion) || input.metadata.sourceVersion < 1) {
    throw new Error("metadata.sourceVersion must be a positive integer");
  }
  if (!Number.isFinite(Date.parse(input.metadata.generatedAtIso))) {
    throw new Error("metadata.generatedAtIso must be an ISO date");
  }

  const withoutHash = {
    schemaVersion: PROFESSIONAL_DOCUMENT_SCHEMA_VERSION,
    strategy: PROFESSIONAL_PDF_STRATEGY,
    kind: input.kind,
    audience: input.audience,
    branding: input.branding,
    metadata: input.metadata,
    payload: applyProfessionalDocumentAudiencePolicy(input.payload, input.audience) as T,
  };

  return {
    ...withoutHash,
    snapshotHash: sha256(withoutHash),
  };
}

export function createProposalPdfSnapshot(input: {
  proposalVersion: number;
  document: ProposalDocument;
  audience: ProfessionalDocumentAudience;
  branding?: Partial<ProfessionalDocumentBranding>;
}): ProfessionalDocumentSnapshot<ProposalDocument> {
  const proposalBranding = input.document.branding;
  return buildSnapshot({
    kind: "PROPOSAL",
    audience: input.audience,
    branding: {
      companyName: proposalBranding.companyName,
      website: proposalBranding.website ?? null,
      phone: proposalBranding.phone ?? null,
      email: proposalBranding.email ?? null,
      ...input.branding,
    },
    metadata: {
      documentNumber: input.document.proposalNumber,
      title: input.document.title,
      sourceVersion: input.proposalVersion,
      generatedAtIso: input.document.createdAtIso,
    },
    payload: input.document,
  });
}

export function createCloseoutPdfSnapshot<T>(input: {
  packageVersion: number;
  packageId: string;
  projectName: string;
  generatedAt: Date | string;
  manifest: T;
  audience: ProfessionalDocumentAudience;
  branding: ProfessionalDocumentBranding;
}): ProfessionalDocumentSnapshot<T> {
  const generatedAtIso =
    input.generatedAt instanceof Date
      ? input.generatedAt.toISOString()
      : new Date(input.generatedAt).toISOString();

  return buildSnapshot({
    kind: "CLOSEOUT",
    audience: input.audience,
    branding: input.branding,
    metadata: {
      documentNumber: input.packageId,
      title: `${input.projectName} Closeout Package`,
      sourceVersion: input.packageVersion,
      generatedAtIso,
    },
    payload: input.manifest,
  });
}

export function verifyProfessionalDocumentSnapshot(snapshot: ProfessionalDocumentSnapshot) {
  const { snapshotHash, ...withoutHash } = snapshot;
  return sha256(withoutHash) === snapshotHash;
}

export type ProfessionalPdfRenderRequest = {
  snapshotJson: string;
  snapshotHash: string;
  fileName: string;
  strategy: typeof PROFESSIONAL_PDF_STRATEGY;
};

export function toProfessionalPdfRenderRequest(
  snapshot: ProfessionalDocumentSnapshot
): ProfessionalPdfRenderRequest {
  const safeNumber = snapshot.metadata.documentNumber.replace(/[^A-Za-z0-9._-]+/g, "-");
  return {
    snapshotJson: canonicalProfessionalDocumentJson(snapshot),
    snapshotHash: snapshot.snapshotHash,
    fileName: `${snapshot.kind.toLowerCase()}-${safeNumber}-v${snapshot.metadata.sourceVersion}.pdf`,
    strategy: PROFESSIONAL_PDF_STRATEGY,
  };
}
