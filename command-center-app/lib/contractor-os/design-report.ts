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

export type DesignReportCableScheduleRow = {
  floorId: string;
  floorName: string;
  elementId: string;
  discipline?: string;
  category?: string;
};

export type DesignReportData = {
  profile: DesignReportProfile;
  floors: DesignReportFloor[];
  bom: ReturnType<typeof buildDesignTakeoff>["items"];
  cableSchedule: DesignReportCableScheduleRow[];
  pricingSummary?: ReturnType<typeof buildDesignTakeoff>["totals"];
};

export function buildDesignReportData(input: {
  floors: readonly DesignReportFloor[];
  profile?: Partial<DesignReportProfile>;
  pricing?: DesignTakeoffPricing;
  metersPerDesignUnit?: number;
}): DesignReportData {
  const profile = resolveDesignReportProfile(input.profile);
  const floors = input.floors.map((floor) => ({
    ...floor,
    document: {
      ...floor.document,
      elements: filterReportElementsByLayer(floor.document.elements, profile),
    },
  }));

  const combinedDocument: CanvasDocument = {
    schemaVersion: 1,
    elements: floors.flatMap((floor) => floor.document.elements),
  };
  const takeoff = buildDesignTakeoff(combinedDocument, input.pricing, input.metersPerDesignUnit);

  const cableSchedule = reportIncludesSection(profile, "CABLE_SCHEDULE")
    ? floors.flatMap((floor) =>
        floor.document.elements.flatMap((element) =>
          element.kind === "CABLE_PATH"
            ? [{
                floorId: floor.id,
                floorName: floor.name,
                elementId: element.id,
                discipline: element.discipline,
                category: element.category,
              }]
            : [],
        ),
      )
    : [];

  return {
    profile,
    floors: reportIncludesSection(profile, "FLOOR_PLANS") ? floors : [],
    bom: reportIncludesSection(profile, "BOM") ? takeoff.items : [],
    cableSchedule,
    pricingSummary: reportIncludesSection(profile, "PRICING_SUMMARY") ? takeoff.totals : undefined,
  };
}
