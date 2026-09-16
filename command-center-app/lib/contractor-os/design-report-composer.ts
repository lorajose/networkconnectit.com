import type { CanvasDocument } from "./design-canvas-state";
import { buildDesignTakeoff, type DesignTakeoffPricing } from "./design-takeoff";
import {
  filterReportElementsByLayer,
  reportIncludesSection,
  resolveDesignReportProfile,
  type DesignReportProfile,
} from "./design-report-profile";

export type DesignReportFloor = { id: string; name: string; document: CanvasDocument };
export type DesignReportSourceLink = { estimateId?: string; proposalId?: string };
export type DesignReportComposition = {
  profile: DesignReportProfile;
  floors: Array<{ id: string; name: string; document: CanvasDocument }>;
  bom: Array<{ key: string; description: string; quantity: number; unit: "EA" | "FT" }>;
  cableSchedule: Array<{ key: string; description: string; feet: number }>;
  pricingSummary?: { sellSubtotal: number; total: number };
  source: DesignReportSourceLink;
};

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value as Readonly<T>;
}

export function composeDesignReport(input: {
  floors: readonly DesignReportFloor[];
  profile?: Partial<DesignReportProfile>;
  pricing?: DesignTakeoffPricing;
  metersPerDesignUnit?: number;
  source?: DesignReportSourceLink;
}): DesignReportComposition {
  const profile = resolveDesignReportProfile(input.profile);
  const metersPerDesignUnit = input.metersPerDesignUnit ?? 0.01;
  const floors = input.floors.map((floor) => ({
    ...floor,
    document: {
      ...floor.document,
      elements: filterReportElementsByLayer(floor.document.elements.filter((element) => !element.hidden), profile),
    },
  }));

  const takeoffs = floors.map((floor) => buildDesignTakeoff(floor.document, input.pricing, metersPerDesignUnit));
  const grouped = new Map<string, { key: string; description: string; quantity: number; unit: "EA" | "FT" }>();
  for (const takeoff of takeoffs) {
    for (const item of takeoff.items) {
      const current = grouped.get(item.key);
      if (current) current.quantity = Math.round((current.quantity + item.quantity) * 100) / 100;
      else grouped.set(item.key, { key: item.key, description: item.description, quantity: item.quantity, unit: item.unit });
    }
  }

  const bom = reportIncludesSection(profile, "BOM") ? [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key)) : [];
  const cableSchedule = reportIncludesSection(profile, "CABLE_SCHEDULE")
    ? bom.filter((item) => item.unit === "FT").map((item) => ({ key: item.key, description: item.description, feet: item.quantity }))
    : [];
  const sellSubtotal = takeoffs.reduce((sum, takeoff) => sum + takeoff.totals.sellSubtotal, 0);
  const total = takeoffs.reduce((sum, takeoff) => sum + takeoff.totals.total, 0);

  return {
    profile,
    floors,
    bom,
    cableSchedule,
    pricingSummary: reportIncludesSection(profile, "PRICING_SUMMARY") ? { sellSubtotal, total } : undefined,
    source: { estimateId: input.source?.estimateId, proposalId: input.source?.proposalId },
  };
}

export type IssuedDesignReportSnapshot = {
  id: string;
  status: "ISSUED";
  projectId: string;
  revision: number;
  issuedAt: string;
  issuedByUserId: string;
  source: DesignReportSourceLink;
  composition: Readonly<DesignReportComposition>;
};

export function issueDesignReport(input: {
  projectId: string;
  revision: number;
  composition: DesignReportComposition;
  issuedByUserId: string;
  issuedAt?: string;
}): Readonly<IssuedDesignReportSnapshot> {
  if (!input.projectId.trim()) throw new Error("Design project is required");
  if (!Number.isInteger(input.revision) || input.revision < 1) throw new Error("Valid design revision is required");
  if (!input.issuedByUserId.trim()) throw new Error("Authenticated issuer is required");
  if (!input.composition.source.estimateId && !input.composition.source.proposalId) throw new Error("Issued design report must link to an Estimate or Proposal");

  const issuedAt = input.issuedAt ?? new Date().toISOString();
  return deepFreeze({
    id: `design-report:${input.projectId}:r${input.revision}:${issuedAt}`,
    status: "ISSUED" as const,
    projectId: input.projectId,
    revision: input.revision,
    issuedAt,
    issuedByUserId: input.issuedByUserId,
    source: { ...input.composition.source },
    composition: input.composition,
  });
}
