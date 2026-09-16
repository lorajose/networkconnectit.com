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
  const requestedSections = profile?.sections ?? (clientSafe ? DEFAULT_CLIENT_DESIGN_REPORT_PROFILE.sections : DEFAULT_INTERNAL_DESIGN_REPORT_PROFILE.sections);
  const sections = clientSafe ? requestedSections.filter((section) => section !== "PRICING_SUMMARY") : requestedSections;
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

export function filterReportElementsByLayer<T extends { layerId?: string | null }>(elements: readonly T[], profile: DesignReportProfile): T[] {
  if (!profile.visibleLayerIds?.length) return [...elements];
  const visible = new Set(profile.visibleLayerIds);
  return elements.filter((element) => !element.layerId || visible.has(element.layerId));
}
