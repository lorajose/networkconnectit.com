import { createHash, randomUUID } from "node:crypto";

export type DesignReportSection =
  | "COVER"
  | "FLOOR_PLANS"
  | "CAMERA_COVERAGE"
  | "BOM"
  | "CABLE_SCHEDULE"
  | "PRICING_SUMMARY";

export type DesignReportProfile = {
  sections: readonly DesignReportSection[];
  visibleLayerIds?: readonly string[];
  includePricing: boolean;
  clientSafe: boolean;
};

export type IssuedDesignReportSnapshot = {
  id: string;
  status: "ISSUED";
  issuedAt: string;
  issuedByUserId: string;
  organizationId: string;
  designProjectId: string;
  designRevision: number;
  estimateId?: string;
  proposalId?: string;
  profile: DesignReportProfile;
  evidenceHash: string;
};

export const DEFAULT_CLIENT_DESIGN_REPORT_PROFILE: DesignReportProfile = {
  sections: ["COVER", "FLOOR_PLANS", "CAMERA_COVERAGE", "BOM", "CABLE_SCHEDULE"],
  includePricing: false,
  clientSafe: true,
};

export const DEFAULT_INTERNAL_DESIGN_REPORT_PROFILE: DesignReportProfile = {
  sections: ["COVER", "FLOOR_PLANS", "CAMERA_COVERAGE", "BOM", "CABLE_SCHEDULE", "PRICING_SUMMARY"],
  includePricing: true,
  clientSafe: false,
};

export function resolveDesignReportProfile(profile?: Partial<DesignReportProfile>): DesignReportProfile {
  const clientSafe = profile?.clientSafe ?? true;
  const requestedSections = profile?.sections ?? DEFAULT_CLIENT_DESIGN_REPORT_PROFILE.sections;
  const sections = clientSafe
    ? requestedSections.filter((section) => section !== "PRICING_SUMMARY")
    : requestedSections;

  return {
    sections,
    visibleLayerIds: profile?.visibleLayerIds,
    includePricing: clientSafe ? false : Boolean(profile?.includePricing),
    clientSafe,
  };
}

export function reportIncludesSection(profile: DesignReportProfile, section: DesignReportSection) {
  if (section === "PRICING_SUMMARY" && (profile.clientSafe || !profile.includePricing)) return false;
  return profile.sections.includes(section);
}

export function filterReportElementsByLayer<T extends { layerId?: string | null }>(
  elements: readonly T[],
  profile: DesignReportProfile,
): T[] {
  if (!profile.visibleLayerIds?.length) return [...elements];
  const visible = new Set(profile.visibleLayerIds);
  return elements.filter((element) => !element.layerId || visible.has(element.layerId));
}

export function createIssuedDesignReportSnapshot(input: {
  issuedByUserId: string;
  organizationId: string;
  designProjectId: string;
  designRevision: number;
  estimateId?: string;
  proposalId?: string;
  profile?: Partial<DesignReportProfile>;
  evidence: unknown;
  issuedAt?: Date;
}): IssuedDesignReportSnapshot {
  if (!input.issuedByUserId.trim()) throw new Error("Issued report requires an authenticated user");
  if (!input.organizationId.trim()) throw new Error("Issued report requires an organization");
  if (!input.designProjectId.trim()) throw new Error("Issued report requires a design project");
  if (!Number.isInteger(input.designRevision) || input.designRevision < 1) throw new Error("Invalid design revision");

  const profile = resolveDesignReportProfile(input.profile);
  const evidenceHash = createHash("sha256")
    .update(JSON.stringify({
      organizationId: input.organizationId,
      designProjectId: input.designProjectId,
      designRevision: input.designRevision,
      estimateId: input.estimateId ?? null,
      proposalId: input.proposalId ?? null,
      profile,
      evidence: input.evidence,
    }))
    .digest("hex");

  return Object.freeze({
    id: randomUUID(),
    status: "ISSUED" as const,
    issuedAt: (input.issuedAt ?? new Date()).toISOString(),
    issuedByUserId: input.issuedByUserId,
    organizationId: input.organizationId,
    designProjectId: input.designProjectId,
    designRevision: input.designRevision,
    estimateId: input.estimateId,
    proposalId: input.proposalId,
    profile: Object.freeze({ ...profile, sections: Object.freeze([...profile.sections]) }),
    evidenceHash,
  });
}
