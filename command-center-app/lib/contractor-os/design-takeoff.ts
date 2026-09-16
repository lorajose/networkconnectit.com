import type { CanvasDocument, CanvasElement } from "./design-canvas-state";
import { measureCableRoute, type CableRouteSettings } from "./cable-route";
import { calculateEstimate, type CostLineInput, type EstimateTotals } from "./cost-engine";

export type DesignTakeoffItem = {
  key: string;
  discipline?: string;
  category?: string;
  description: string;
  quantity: number;
  unit: "EA" | "FT";
  sourceElementIds: string[];
};

export type DesignTakeoffPricing = {
  materialUnitCostByKey?: Record<string, number>;
  laborHoursPerDevice?: number;
  laborHourlyCost?: number;
  markupPercent?: number;
  laborBurdenPercent?: number;
  contingencyPercent?: number;
};

export type DesignTakeoffResult = {
  items: DesignTakeoffItem[];
  costLines: CostLineInput[];
  totals: EstimateTotals;
};

function activeElements(document: CanvasDocument) {
  return document.elements.filter((element) => !element.hidden);
}

function deviceKey(element: CanvasElement) {
  return `${element.discipline ?? "UNASSIGNED"}:${element.category ?? "DEVICE"}`;
}

export function buildDesignTakeoffItems(document: CanvasDocument, designUnitsPerMeter = 100): DesignTakeoffItem[] {
  const grouped = new Map<string, DesignTakeoffItem>();

  for (const element of activeElements(document)) {
    if (element.kind === "DEVICE") {
      const key = deviceKey(element);
      const existing = grouped.get(key);
      if (existing) {
        existing.quantity += 1;
        existing.sourceElementIds.push(element.id);
      } else {
        grouped.set(key, {
          key,
          discipline: element.discipline,
          category: element.category,
          description: `${element.discipline ?? "Unassigned"} ${element.category ?? "device"}`,
          quantity: 1,
          unit: "EA",
          sourceElementIds: [element.id],
        });
      }
      continue;
    }

    if (element.kind === "CABLE_PATH") {
      const settings = element.cableRoute as CableRouteSettings | undefined;
      if (!settings) continue;
      const measurement = measureCableRoute(element.geometry.points, settings, designUnitsPerMeter);
      const key = `CABLE:${settings.cableType}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.quantity += measurement.totalFeet;
        existing.sourceElementIds.push(element.id);
      } else {
        grouped.set(key, {
          key,
          discipline: element.discipline ?? "PATHWAY",
          category: element.category ?? "CABLE_ROUTE",
          description: `${settings.cableType} cable`,
          quantity: measurement.totalFeet,
          unit: "FT",
          sourceElementIds: [element.id],
        });
      }
    }
  }

  return [...grouped.values()].map((item) => ({ ...item, quantity: Math.round(item.quantity * 100) / 100 }));
}

export function buildDesignTakeoff(document: CanvasDocument, pricing: DesignTakeoffPricing = {}, designUnitsPerMeter = 100): DesignTakeoffResult {
  const items = buildDesignTakeoffItems(document, designUnitsPerMeter);
  const costLines: CostLineInput[] = items.map((item) => ({
    type: "MATERIAL",
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitCost: pricing.materialUnitCostByKey?.[item.key] ?? 0,
  }));

  const deviceCount = activeElements(document).filter((element) => element.kind === "DEVICE").length;
  const laborHours = deviceCount * (pricing.laborHoursPerDevice ?? 0);
  if (laborHours > 0) {
    costLines.push({
      type: "LABOR",
      description: "Design-derived installation labor",
      quantity: laborHours,
      unit: "HR",
      unitCost: pricing.laborHourlyCost ?? 0,
    });
  }

  return {
    items,
    costLines,
    totals: calculateEstimate({
      lines: costLines,
      markupPercent: pricing.markupPercent,
      laborBurdenPercent: pricing.laborBurdenPercent,
      contingencyPercent: pricing.contingencyPercent,
    }),
  };
}
