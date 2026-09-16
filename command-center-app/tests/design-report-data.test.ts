import assert from "node:assert/strict";
import test from "node:test";

import type { CanvasDocument } from "../lib/contractor-os/design-canvas-state";
import { buildDesignReportCommercialSections } from "../lib/contractor-os/design-report-data";
import { resolveDesignReportProfile } from "../lib/contractor-os/design-report-profile";

const document: CanvasDocument = {
  schemaVersion: 1,
  elements: [
    { id: "cam-1", kind: "DEVICE", discipline: "CCTV", category: "CAMERA", geometry: { x: 10, y: 10, width: 20, height: 20, rotation: 0 } },
    { id: "cam-2", kind: "DEVICE", discipline: "CCTV", category: "CAMERA", geometry: { x: 40, y: 10, width: 20, height: 20, rotation: 0 } },
  ],
};

test("report commercial sections expose BOM but not pricing for client-safe profile", () => {
  const profile = resolveDesignReportProfile({ clientSafe: true, includePricing: true, sections: ["BOM", "PRICING_SUMMARY"] });
  const result = buildDesignReportCommercialSections([document], profile, { materialUnitCostByKey: { "CCTV:CAMERA": 125 } });

  assert.equal(result.bom.length, 1);
  assert.equal(result.bom[0]?.quantity, 2);
  assert.equal(result.pricingSummary, null);
});

test("internal report pricing is derived from the same design takeoff authority", () => {
  const profile = resolveDesignReportProfile({ clientSafe: false, includePricing: true, sections: ["BOM", "PRICING_SUMMARY"] });
  const result = buildDesignReportCommercialSections([document], profile, { materialUnitCostByKey: { "CCTV:CAMERA": 125 }, markupPercent: 20 });

  assert.equal(result.pricingSummary?.materialCost, 250);
  assert.equal(result.pricingSummary?.markupAmount, 50);
  assert.equal(result.pricingSummary?.totalPrice, 300);
});

test("unselected commercial sections remain absent", () => {
  const profile = resolveDesignReportProfile({ clientSafe: false, includePricing: false, sections: ["COVER"] });
  const result = buildDesignReportCommercialSections([document], profile);

  assert.deepEqual(result.bom, []);
  assert.deepEqual(result.cableSchedule, []);
  assert.equal(result.pricingSummary, null);
});
