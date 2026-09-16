import type { CanvasDocument } from "./design-canvas-state";
import { buildDesignTakeoff, type DesignTakeoffPricing } from "./design-takeoff";
import {
  filterReportElementsByLayer,
  reportIncludesSection,
  resolveDesignReportProfile,
  type DesignReportProfile,
} from "./design-report-profile";

export type DesignReportFloor = {
  id: string;
  name: string;
  document: CanvasDocument;
};

export type DesignReportSourceLink = {
  estimateId?: string;
  proposalId?: string;
};

export type DesignReportComposition = {
  profile: DesignReportProfile;
  floors: Array<{ id: string; name: string; document: CanvasDocument }>;
  bom: Array<{ key: string; description: string; quantity: number; unit: "EA" | "FT" }>;
  cableSchedule: Array<{ key: string; description: string; feet: number }>;
  pricingSummary?: { sellSubtotal: number; total: number };
  source: DesignReportSourceLink;
};

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
      elements: filterReportElementsByLayer(floor.document.elements, profile),
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

  const bom = reportIncludesSection(profile, "BOM")
    ? [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key))
    : [];
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
