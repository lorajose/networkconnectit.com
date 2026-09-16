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
  laborBurden: number;
  contingencyCost: number;
  directCost: number;
  sellSubtotal: number;
  totalPrice: number;
  grossProfit: number;
  marginPercent: number;
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
  const first = documents[0];
  const combined: CanvasDocument = first
    ? {
        ...first,
        selectedIds: [],
        elements: documents.flatMap((document) => document.elements),
        layers: {
          ...first.layers,
          layers: documents.flatMap((document) => document.layers.layers),
        },
      }
    : {
        schemaVersion: 1,
        viewport: { x: 0, y: 0, zoom: 1 },
        selectedIds: [],
        elements: [],
        layers: { layers: [] },
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
        laborBurden: takeoff.totals.laborBurden,
        contingencyCost: takeoff.totals.contingencyCost,
        directCost: takeoff.totals.directCost,
        sellSubtotal: takeoff.totals.sellSubtotal,
        totalPrice: takeoff.totals.total,
        grossProfit: takeoff.totals.grossProfit,
        marginPercent: takeoff.totals.marginPercent,
      }
    : null;

  return { bom, cableSchedule, pricingSummary };
}
