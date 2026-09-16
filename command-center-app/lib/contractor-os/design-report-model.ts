import type { CanvasDocument } from "./design-canvas-state";
import { buildDesignTakeoffItems, type DesignTakeoffItem } from "./design-takeoff";
import { filterReportElementsByLayer, reportIncludesSection, type DesignReportProfile, type DesignReportSection } from "./design-report-profile";

export type DesignReportFloorSource = { id: string; name: string; document: CanvasDocument };
export type DesignReportCableRow = { key: string; description: string; quantityFeet: number; sourceElementIds: string[] };
export type DesignReportModel = {
  sections: readonly DesignReportSection[];
  floors: Array<{ id: string; name: string; elementCount: number; deviceCount: number; cablePathCount: number }>;
  bom: DesignTakeoffItem[];
  cableSchedule: DesignReportCableRow[];
  pricingVisible: boolean;
  warnings: string[];
};

function documentForProfile(document: CanvasDocument, profile: DesignReportProfile): CanvasDocument {
  return { ...document, elements: filterReportElementsByLayer(document.elements.filter((element) => !element.hidden), profile) };
}

export function buildDesignReportModel(floors: readonly DesignReportFloorSource[], profile: DesignReportProfile, metersPerDesignUnit?: number): DesignReportModel {
  const filteredFloors = floors.map((floor) => ({ ...floor, document: documentForProfile(floor.document, profile) }));
  const hasCableRoutes = filteredFloors.some((floor) => floor.document.elements.some((element) => element.kind === "CABLE_PATH"));
  const calibrated = Number.isFinite(metersPerDesignUnit) && Number(metersPerDesignUnit) > 0;
  const takeoff = filteredFloors.flatMap((floor) => {
    const document = calibrated ? floor.document : { ...floor.document, elements: floor.document.elements.filter((element) => element.kind !== "CABLE_PATH") };
    return buildDesignTakeoffItems(document, calibrated ? Number(metersPerDesignUnit) : 0.01);
  });
  const combined = new Map<string, DesignTakeoffItem>();
  for (const item of takeoff) {
    const existing = combined.get(item.key);
    if (existing) {
      existing.quantity = Math.round((existing.quantity + item.quantity) * 100) / 100;
      existing.sourceElementIds = [...new Set([...existing.sourceElementIds, ...item.sourceElementIds])].sort();
    } else combined.set(item.key, { ...item, sourceElementIds: [...item.sourceElementIds] });
  }
  const bom = [...combined.values()].sort((a, b) => a.key.localeCompare(b.key));
  const cableSchedule = bom.filter((item) => item.unit === "FT").map((item) => ({ key: item.key, description: item.description, quantityFeet: item.quantity, sourceElementIds: item.sourceElementIds }));
  return {
    sections: profile.sections,
    floors: filteredFloors.map((floor) => ({ id: floor.id, name: floor.name, elementCount: floor.document.elements.length, deviceCount: floor.document.elements.filter((element) => element.kind === "DEVICE").length, cablePathCount: floor.document.elements.filter((element) => element.kind === "CABLE_PATH").length })),
    bom: reportIncludesSection(profile, "BOM") ? bom : [],
    cableSchedule: reportIncludesSection(profile, "CABLE_SCHEDULE") ? cableSchedule : [],
    pricingVisible: reportIncludesSection(profile, "PRICING_SUMMARY"),
    warnings: hasCableRoutes && !calibrated ? ["Cable schedule omitted because the floor plan scale is not calibrated."] : [],
  };
}
