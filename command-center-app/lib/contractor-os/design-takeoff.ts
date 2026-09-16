import type { CanvasDocument, CanvasElement } from "./design-canvas-state";
import { cableRouteTypeLabel, measureCableRoute, routeFromGeometry, type CableRouteSettings } from "./cable-route";
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

export type ProposedDesignTakeoffSnapshot = {
  id: string;
  generatedAt: string;
  status: "PROPOSED";
  requiresHumanApproval: true;
  items: DesignTakeoffItem[];
};

export type DesignTakeoffDiff = {
  added: DesignTakeoffItem[];
  removed: DesignTakeoffItem[];
  changed: Array<{ before: DesignTakeoffItem; after: DesignTakeoffItem; quantityDelta: number }>;
  unchanged: DesignTakeoffItem[];
};

function activeElements(document: CanvasDocument) {
  return document.elements.filter((element) => !element.hidden);
}

function deviceKey(element: CanvasElement) {
  return `${element.discipline ?? "UNASSIGNED"}:${element.category ?? "DEVICE"}`;
}

export function buildDesignTakeoffItems(document: CanvasDocument, metersPerDesignUnit = 0.01): DesignTakeoffItem[] {
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
      const route = routeFromGeometry(element.id, element.geometry.points, settings);
      const measurement = measureCableRoute(route, metersPerDesignUnit);
      const cableType = cableRouteTypeLabel(route);
      const key = `CABLE:${cableType}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.quantity += measurement.totalFeet;
        existing.sourceElementIds.push(element.id);
      } else {
        grouped.set(key, {
          key,
          discipline: element.discipline ?? "PATHWAY",
          category: element.category ?? "CABLE_ROUTE",
          description: `${cableType} cable`,
          quantity: measurement.totalFeet,
          unit: "FT",
          sourceElementIds: [element.id],
        });
      }
    }
  }

  return [...grouped.values()]
    .map((item) => ({ ...item, quantity: Math.round(item.quantity * 100) / 100, sourceElementIds: [...item.sourceElementIds].sort() }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function buildDesignTakeoff(document: CanvasDocument, pricing: DesignTakeoffPricing = {}, metersPerDesignUnit = 0.01): DesignTakeoffResult {
  const items = buildDesignTakeoffItems(document, metersPerDesignUnit);
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

export function createProposedDesignTakeoffSnapshot(
  document: CanvasDocument,
  metersPerDesignUnit = 0.01,
  generatedAt = new Date().toISOString(),
): ProposedDesignTakeoffSnapshot {
  const items = buildDesignTakeoffItems(document, metersPerDesignUnit);
  const signature = items.map((item) => `${item.key}:${item.quantity}:${item.sourceElementIds.join(",")}`).join("|");
  return {
    id: `design-takeoff:${generatedAt}:${signature}`,
    generatedAt,
    status: "PROPOSED",
    requiresHumanApproval: true,
    items,
  };
}

export function diffDesignTakeoffItems(previous: DesignTakeoffItem[], proposed: DesignTakeoffItem[]): DesignTakeoffDiff {
  const before = new Map(previous.map((item) => [item.key, item]));
  const after = new Map(proposed.map((item) => [item.key, item]));
  const added: DesignTakeoffItem[] = [];
  const removed: DesignTakeoffItem[] = [];
  const changed: DesignTakeoffDiff["changed"] = [];
  const unchanged: DesignTakeoffItem[] = [];

  for (const item of proposed) {
    const old = before.get(item.key);
    if (!old) {
      added.push(item);
      continue;
    }
    const sameSources = old.sourceElementIds.slice().sort().join("|") === item.sourceElementIds.slice().sort().join("|");
    if (old.quantity !== item.quantity || old.unit !== item.unit || !sameSources) {
      changed.push({ before: old, after: item, quantityDelta: Math.round((item.quantity - old.quantity) * 100) / 100 });
    } else {
      unchanged.push(item);
    }
  }

  for (const item of previous) if (!after.has(item.key)) removed.push(item);
  return { added, removed, changed, unchanged };
}

export function diffProposedDesignTakeoff(
  previous: ProposedDesignTakeoffSnapshot | undefined,
  proposed: ProposedDesignTakeoffSnapshot,
): DesignTakeoffDiff {
  return diffDesignTakeoffItems(previous?.items ?? [], proposed.items);
}
