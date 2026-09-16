import type { CanvasDocument } from "./design-canvas-state";
import { buildDesignTakeoff, type DesignTakeoffPricing } from "./design-takeoff";
import { reportIncludesSection, type DesignReportProfile } from "./design-report-profile";

export type DesignReportBomRow = {
  key: string;
  description: string;
  quantity: number;
  unit: "EA" | "FT";
};

export type DesignReportCableRow = {
  key: string;
  description: string;
  lengthFeet: number;
};

export type DesignReportPricingSummary = {
  materialCost: number;
  laborCost: number;
  subtotalCost: number;
  markupAmount: number;
  contingencyAmount: number;
  totalPrice: number;
} | null;

export type DesignReportCommercialSections = {
  bom: DesignReportBomRow[];
  cableSchedule: DesignReportCableRow[];
  pricingSummary: DesignReportPricingSummary;
};

export function buildDesignReportCommercialSections(
  documents: readonly CanvasDocument[],
  profile: DesignReportProfile,
  pricing: DesignTakeoffPricing = {},
  metersPerDesignUnit = 0.01,
): DesignReportCommercialSections {
  const combined: CanvasDocument = {
    schemaVersion: 1,
    elements: documents.flatMap((document) => document.elements),
  };
  const takeoff = buildDesignTakeoff(combined, pricing, metersPerDesignUnit);

  const bom = reportIncludesSection(profile, "BOM")
    ? takeoff.items
        .filter((item) => item.unit === "EA")
        .map(({ key, description, quantity, unit }) => ({ key, description, quantity, unit }))
    : [];

  const cableSchedule = reportIncludesSection(profile, "CABLE_SCHEDULE")
    ? takeoff.items
        .filter((item) => item.unit === "FT")
        .map((item) => ({ key: item.key, description: item.description, lengthFeet: item.quantity }))
    : [];

  const pricingSummary = reportIncludesSection(profile, "PRICING_SUMMARY")
    ? {
        materialCost: takeoff.totals.materialCost,
        laborCost: takeoff.totals.laborCost,
        subtotalCost: takeoff.totals.subtotalCost,
        markupAmount: takeoff.totals.markupAmount,
        contingencyAmount: takeoff.totals.contingencyAmount,
        totalPrice: takeoff.totals.totalPrice,
      }
    : null;

  return { bom, cableSchedule, pricingSummary };
}
