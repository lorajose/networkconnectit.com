import assert from "node:assert/strict";
import test from "node:test";
import { fieldScopeToTakeoffSuggestions, validateFieldScopeDraft, type ReviewedFieldScope } from "../../lib/contractor-os/field-scope";

const base: ReviewedFieldScope = {
  schemaVersion: "1",
  projectId: "project-1",
  siteId: "site-1",
  surveySessionId: "survey-1",
  surveyPointId: "point-1",
  stableKey: "CAM-001",
  system: "SURVEILLANCE",
  discipline: "CCTV",
  deviceType: { value: "Outdoor PoE camera", confidence: "HIGH" },
  location: { value: "West entrance", confidence: "HIGH" },
  environment: { value: "OUTDOOR", confidence: "HIGH" },
  quantity: { value: 1, confidence: "HIGH" },
  mountingHeightFt: { value: 16, confidence: "MEDIUM" },
  mountingSurface: { value: "Brick", confidence: "HIGH" },
  cableType: { value: "CAT6", confidence: "HIGH" },
  estimatedCableLengthFt: { value: 140, confidence: "MEDIUM" },
  pathway: { value: "Ceiling", confidence: "MEDIUM" },
  destination: { value: "IDF-2", confidence: "HIGH" },
  accessEquipment: { value: "LIFT", confidence: "HIGH" },
  requestedAccessories: [],
  suggestedAccessories: ["Weatherproof junction box"],
  laborDrivers: ["LIFT", "EXTERIOR_MOUNT", "TEST", "COMMISSION"],
  assumptions: [],
  exclusions: [],
  missingInformation: [],
  sourceNote: "Camera on west entrance, brick wall, 16 ft high, about 140 ft to IDF-2.",
  reviewedByUserId: "user-1",
  reviewedAt: "2026-10-03T12:00:00.000Z",
};

test("requires stable lifecycle identity", () => {
  assert.throws(() => validateFieldScopeDraft({ ...base, stableKey: " " }), /Stable lifecycle key/);
});

test("hands reviewed device, cable and accessory suggestions to takeoff without pricing", () => {
  const items = fieldScopeToTakeoffSuggestions(base);
  assert.equal(items.length, 3);
  assert.deepEqual({ category: items[0].category, itemCode: items[0].itemCode, source: items[0].source }, { category: "CCTV", itemCode: "CAM-001", source: "AI_SUGGESTED" });
  assert.deepEqual({ category: items[1].category, itemCode: items[1].itemCode, countedQuantity: items[1].countedQuantity }, { category: "COPPER", itemCode: "CAM-001:CABLE", countedQuantity: 140 });
  assert.deepEqual({ itemCode: items[2].itemCode, description: items[2].description }, { itemCode: "CAM-001:ACCESSORY:1", description: "Weatherproof junction box" });
  for (const item of items) {
    assert.equal("unitCost" in item, false);
    assert.equal("unitPrice" in item, false);
    assert.equal("markupPercent" in item, false);
    assert.equal("marginPercent" in item, false);
  }
});
