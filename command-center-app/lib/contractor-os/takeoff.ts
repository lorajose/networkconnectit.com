export const TAKEOFF_CATEGORIES = [
  "STRUCTURED_CABLING",
  "COPPER",
  "FIBER",
  "CCTV",
  "ACCESS_CONTROL",
  "WIFI",
  "PATHWAY",
  "RACK_EQUIPMENT",
  "NETWORK_EQUIPMENT",
  "OTHER",
] as const;

export type TakeoffCategory = (typeof TAKEOFF_CATEGORIES)[number];
export const TAKEOFF_SOURCES = ["MANUAL", "AI_SUGGESTED"] as const;
export type TakeoffSource = (typeof TAKEOFF_SOURCES)[number];

export type TakeoffItemInput = {
  category: TakeoffCategory;
  itemCode?: string | null;
  description: string;
  unit: string;
  countedQuantity: number;
  overrideQuantity?: number | null;
  sheetReference?: string | null;
  drawingRevision?: string | null;
  notes?: string | null;
  source?: TakeoffSource;
};

function clean(value: string | null | undefined, max: number) {
  const result = value?.trim() || null;
  if (result && result.length > max) throw new Error(`Value exceeds ${max} characters`);
  return result;
}

function quantity(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be zero or greater`);
  return Math.round(value * 1000) / 1000;
}

export function normalizeTakeoffItem(input: TakeoffItemInput): TakeoffItemInput {
  if (!TAKEOFF_CATEGORIES.includes(input.category)) throw new Error("Takeoff category is invalid");
  if (input.source && !TAKEOFF_SOURCES.includes(input.source)) throw new Error("Takeoff source is invalid");
  const description = input.description.trim();
  if (!description) throw new Error("Description is required");
  if (description.length > 255) throw new Error("Description is too long");
  const unit = input.unit.trim().toUpperCase();
  if (!unit || unit.length > 32) throw new Error("Unit is invalid");
  return {
    ...input,
    description,
    unit,
    countedQuantity: quantity(input.countedQuantity, "Counted quantity"),
    overrideQuantity: input.overrideQuantity == null ? null : quantity(input.overrideQuantity, "Override quantity"),
    itemCode: clean(input.itemCode, 191),
    sheetReference: clean(input.sheetReference, 191),
    drawingRevision: clean(input.drawingRevision, 64),
    notes: clean(input.notes, 4000),
    source: input.source ?? "MANUAL",
  };
}

export function effectiveTakeoffQuantity(item: Pick<TakeoffItemInput, "countedQuantity" | "overrideQuantity">) {
  return item.overrideQuantity ?? item.countedQuantity;
}

export function createEditableBomInput(item: TakeoffItemInput) {
  const normalized = normalizeTakeoffItem(item);
  return {
    catalogCode: normalized.itemCode ?? null,
    description: normalized.description,
    unit: normalized.unit,
    generatedQuantity: effectiveTakeoffQuantity(normalized),
    overrideQuantity: null as number | null,
    costRuleKey: normalized.itemCode ?? normalized.category,
    notes: normalized.notes ?? null,
  };
}
