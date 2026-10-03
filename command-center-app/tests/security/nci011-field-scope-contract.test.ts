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

describe("NCI-011 field-scope contract", () => {
  it("requires stable lifecycle identity", () => {
    expect(() => validateFieldScopeDraft({ ...base, stableKey: " " })).toThrow("Stable lifecycle key");
  });

  it("hands reviewed device, cable and accessory suggestions to takeoff without pricing", () => {
    const items = fieldScopeToTakeoffSuggestions(base);
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ category: "CCTV", itemCode: "CAM-001", source: "AI_SUGGESTED" });
    expect(items[1]).toMatchObject({ category: "COPPER", itemCode: "CAM-001:CABLE", countedQuantity: 140 });
    expect(items[2]).toMatchObject({ itemCode: "CAM-001:ACCESSORY:1", description: "Weatherproof junction box" });
    for (const item of items) {
      expect(item).not.toHaveProperty("unitCost");
      expect(item).not.toHaveProperty("unitPrice");
      expect(item).not.toHaveProperty("markupPercent");
      expect(item).not.toHaveProperty("marginPercent");
    }
  });
});
