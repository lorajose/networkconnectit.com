import { createHash } from "node:crypto";

import type { DesignReportProfile } from "./design-report-profile";

export type DesignReportEvidenceLink = {
  estimateId?: string;
  proposalId?: string;
};

export type IssuedDesignReportManifest = {
  id: string;
  organizationId: string;
  designProjectId: string;
  designRevision: number;
  issuedAt: string;
  issuedByUserId: string;
  profile: DesignReportProfile;
  evidence: DesignReportEvidenceLink;
  sourceDigest: string;
  immutable: true;
};

export type IssueDesignReportInput = {
  organizationId: string;
  designProjectId: string;
  designRevision: number;
  issuedAt?: Date;
  issuedByUserId: string;
  profile: DesignReportProfile;
  evidence?: DesignReportEvidenceLink;
  sourceSnapshot: unknown;
};

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stable(item)]),
    );
  }
  return value;
}

export function digestDesignReportSource(sourceSnapshot: unknown) {
  return createHash("sha256").update(JSON.stringify(stable(sourceSnapshot))).digest("hex");
}

export function issueDesignReportManifest(input: IssueDesignReportInput): IssuedDesignReportManifest {
  if (!input.organizationId.trim()) throw new Error("Organization is required");
  if (!input.designProjectId.trim()) throw new Error("Design project is required");
  if (!Number.isInteger(input.designRevision) || input.designRevision < 1) throw new Error("Valid design revision is required");
  if (!input.issuedByUserId.trim()) throw new Error("Authenticated issuer is required");

  const issuedAt = input.issuedAt ?? new Date();
  const sourceDigest = digestDesignReportSource(input.sourceSnapshot);
  const identity = `${input.organizationId}:${input.designProjectId}:${input.designRevision}:${issuedAt.toISOString()}:${sourceDigest}`;
  const id = `design-report:${createHash("sha256").update(identity).digest("hex").slice(0, 24)}`;

  return Object.freeze({
    id,
    organizationId: input.organizationId,
    designProjectId: input.designProjectId,
    designRevision: input.designRevision,
    issuedAt: issuedAt.toISOString(),
    issuedByUserId: input.issuedByUserId,
    profile: Object.freeze({ ...input.profile, sections: Object.freeze([...input.profile.sections]) }),
    evidence: Object.freeze({ ...(input.evidence ?? {}) }),
    sourceDigest,
    immutable: true as const,
  });
}

export function verifyIssuedDesignReportSource(manifest: IssuedDesignReportManifest, sourceSnapshot: unknown) {
  return manifest.sourceDigest === digestDesignReportSource(sourceSnapshot);
}
