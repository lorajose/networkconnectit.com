import assert from "node:assert/strict";
import test from "node:test";

import {
  createEditableBomInput,
  effectiveTakeoffQuantity,
  normalizeTakeoffItem,
  TAKEOFF_CATEGORIES,
} from "../../lib/contractor-os/takeoff";

test("supports all low-voltage takeoff categories required by NCI-043", () => {
  for (const category of ["STRUCTURED_CABLING", "COPPER", "FIBER", "CCTV", "ACCESS_CONTROL", "WIFI", "PATHWAY", "RACK_EQUIPMENT"] as const) {
    assert.equal(TAKEOFF_CATEGORIES.includes(category), true);
  }
});

test("manual override is authoritative over counted quantity", () => {
  assert.equal(effectiveTakeoffQuantity({ countedQuantity: 24, overrideQuantity: 28 }), 28);
  assert.equal(effectiveTakeoffQuantity({ countedQuantity: 24, overrideQuantity: null }), 24);
});

test("BOM generation preserves sheet evidence and remains editable", () => {
  const takeoff = normalizeTakeoffItem({
    category: "STRUCTURED_CABLING",
    itemCode: "CAT6-DROP",
    description: "Cat6 data drop",
    unit: "ea",
    countedQuantity: 42,
    overrideQuantity: 45,
    sheetReference: "T-201",
    drawingRevision: "Rev B",
    notes: "Includes conference rooms",
    source: "MANUAL",
  });

  assert.equal(takeoff.sheetReference, "T-201");
  assert.equal(takeoff.drawingRevision, "Rev B");

  const bom = createEditableBomInput(takeoff);
  assert.equal(bom.generatedQuantity, 45);
  assert.equal(bom.overrideQuantity, null);
  assert.equal(bom.costRuleKey, "CAT6-DROP");
});

test("AI suggestions can exist but cannot become authoritative through domain normalization", () => {
  const suggestion = normalizeTakeoffItem({
    category: "CCTV",
    description: "Camera count suggestion",
    unit: "EA",
    countedQuantity: 12,
    source: "AI_SUGGESTED",
  });
  assert.equal(suggestion.source, "AI_SUGGESTED");
  assert.equal(suggestion.overrideQuantity, null);
});
