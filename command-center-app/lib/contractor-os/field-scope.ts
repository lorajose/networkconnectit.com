import type { SurveyDiscipline } from "./site-survey";
import type { TakeoffCategory, TakeoffItemInput } from "./takeoff";

export const FIELD_SCOPE_SYSTEMS = [
  "SURVEILLANCE",
  "ACCESS_CONTROL",
  "INTRUSION",
  "NETWORK",
  "WIFI",
  "STRUCTURED_CABLING",
  "MDF_IDF",
  "OTHER",
] as const;

export type FieldScopeSystem = (typeof FIELD_SCOPE_SYSTEMS)[number];

export type FieldScopeConfidence = "HIGH" | "MEDIUM" | "LOW";

export type FieldScopeValue<T> = {
  value: T | null;
  confidence: FieldScopeConfidence;
  sourceText?: string | null;
  assumption?: string | null;
};

export type FieldScopeDraft = {
  schemaVersion: "1";
  projectId: string;
  siteId: string;
  surveySessionId: string;
  surveyPointId?: string | null;
  stableKey: string;
  system: FieldScopeSystem;
  discipline: SurveyDiscipline | null;
  deviceType: FieldScopeValue<string>;
  location: FieldScopeValue<string>;
  environment: FieldScopeValue<"INDOOR" | "OUTDOOR" | "UNKNOWN">;
  quantity: FieldScopeValue<number>;
  mountingHeightFt: FieldScopeValue<number>;
  mountingSurface: FieldScopeValue<string>;
  cableType: FieldScopeValue<string>;
  estimatedCableLengthFt: FieldScopeValue<number>;
  pathway: FieldScopeValue<string>;
  destination: FieldScopeValue<string>;
  accessEquipment: FieldScopeValue<"NONE" | "LADDER" | "LIFT" | "UNKNOWN">;
  requestedAccessories: string[];
  suggestedAccessories: string[];
  laborDrivers: string[];
  assumptions: string[];
  exclusions: string[];
  missingInformation: string[];
  sourceNote?: string | null;
};

export type ReviewedFieldScope = FieldScopeDraft & {
  reviewedByUserId: string;
  reviewedAt: string;
};

const categoryBySystem: Record<FieldScopeSystem, TakeoffCategory> = {
  SURVEILLANCE: "CCTV",
  ACCESS_CONTROL: "ACCESS_CONTROL",
  INTRUSION: "OTHER",
  NETWORK: "NETWORK_EQUIPMENT",
  WIFI: "WIFI",
  STRUCTURED_CABLING: "STRUCTURED_CABLING",
  MDF_IDF: "RACK_EQUIPMENT",
  OTHER: "OTHER",
};

export function validateFieldScopeDraft(draft: FieldScopeDraft) {
  if (draft.schemaVersion !== "1") throw new Error("Unsupported field-scope schema");
  if (!draft.projectId.trim() || !draft.siteId.trim() || !draft.surveySessionId.trim()) {
    throw new Error("Project, site and survey session are required");
  }
  if (!draft.stableKey.trim()) throw new Error("Stable lifecycle key is required");
  if (!FIELD_SCOPE_SYSTEMS.includes(draft.system)) throw new Error("Field-scope system is invalid");
  if (draft.quantity.value != null && (!Number.isFinite(draft.quantity.value) || draft.quantity.value <= 0)) {
    throw new Error("Quantity must be greater than zero");
  }
  if (draft.estimatedCableLengthFt.value != null && draft.estimatedCableLengthFt.value < 0) {
    throw new Error("Cable length cannot be negative");
  }
  if (draft.mountingHeightFt.value != null && draft.mountingHeightFt.value < 0) {
    throw new Error("Mounting height cannot be negative");
  }
  return draft;
}

/**
 * Creates editable AI-suggested takeoff inputs only.
 * This contract deliberately does not assign unit cost, sell price, markup or margin.
 * NCI-010 remains the sole commercial calculation authority.
 */
export function fieldScopeToTakeoffSuggestions(reviewed: ReviewedFieldScope): TakeoffItemInput[] {
  validateFieldScopeDraft(reviewed);
  const quantity = reviewed.quantity.value ?? 1;
  const description = [
    reviewed.deviceType.value ?? reviewed.system.split("_").join(" "),
    reviewed.location.value ? `— ${reviewed.location.value}` : null,
  ].filter(Boolean).join(" ");

  const items: TakeoffItemInput[] = [{
    category: categoryBySystem[reviewed.system],
    itemCode: reviewed.stableKey,
    description,
    unit: "EA",
    countedQuantity: quantity,
    notes: `Field Scope ${reviewed.stableKey}; human-reviewed ${reviewed.reviewedAt}`,
    source: "AI_SUGGESTED",
  }];

  if (reviewed.estimatedCableLengthFt.value && reviewed.estimatedCableLengthFt.value > 0) {
    items.push({
      category: reviewed.cableType.value?.toUpperCase().includes("FIBER") ? "FIBER" : "COPPER",
      itemCode: `${reviewed.stableKey}:CABLE`,
      description: reviewed.cableType.value ?? "Field cable",
      unit: "FT",
      countedQuantity: reviewed.estimatedCableLengthFt.value,
      notes: `Suggested from Field Scope ${reviewed.stableKey}; verify route before pricing`,
      source: "AI_SUGGESTED",
    });
  }

  for (const [index, accessory] of reviewed.suggestedAccessories.entries()) {
    items.push({
      category: categoryBySystem[reviewed.system],
      itemCode: `${reviewed.stableKey}:ACCESSORY:${index + 1}`,
      description: accessory,
      unit: "EA",
      countedQuantity: quantity,
      notes: "AI-suggested companion item; requires human review",
      source: "AI_SUGGESTED",
    });
  }

  return items;
}
