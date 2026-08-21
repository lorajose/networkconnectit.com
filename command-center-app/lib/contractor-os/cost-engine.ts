export type CostLineType = "MATERIAL" | "LABOR" | "EQUIPMENT" | "TRAVEL" | "CONSUMABLE" | "OTHER";

export type CostLineInput = {
  type: CostLineType;
  description: string;
  quantity: number;
  unitCost: number;
  unitPrice?: number;
  taxable?: boolean;
  unit?: string;
};

export type EstimateInput = {
  lines: CostLineInput[];
  markupPercent?: number;
  taxPercent?: number;
  discountAmount?: number;
  laborBurdenPercent?: number;
  contingencyPercent?: number;
};

export type EstimateTotals = {
  materialCost: number;
  laborCost: number;
  laborBurden: number;
  equipmentCost: number;
  travelCost: number;
  consumableCost: number;
  otherCost: number;
  contingencyCost: number;
  directCost: number;
  sellSubtotal: number;
  discountAmount: number;
  taxableSubtotal: number;
  taxAmount: number;
  total: number;
  grossProfit: number;
  marginPercent: number;
};

export type EstimateAuditSnapshot = {
  engineVersion: "1.1";
  calculatedAt: string;
  input: EstimateInput;
  totals: EstimateTotals;
};

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function nonNegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative number`);
  return value;
}

export function calculateEstimate(input: EstimateInput): EstimateTotals {
  const markupPercent = nonNegative(input.markupPercent ?? 0, "markupPercent");
  const taxPercent = nonNegative(input.taxPercent ?? 0, "taxPercent");
  const discountAmount = nonNegative(input.discountAmount ?? 0, "discountAmount");
  const laborBurdenPercent = nonNegative(input.laborBurdenPercent ?? 0, "laborBurdenPercent");
  const contingencyPercent = nonNegative(input.contingencyPercent ?? 0, "contingencyPercent");

  let materialCost = 0;
  let laborCost = 0;
  let equipmentCost = 0;
  let travelCost = 0;
  let consumableCost = 0;
  let otherCost = 0;
  let sellSubtotal = 0;
  let taxableSubtotal = 0;

  for (const line of input.lines) {
    const quantity = nonNegative(line.quantity, "quantity");
    const unitCost = nonNegative(line.unitCost, "unitCost");
    const cost = money(quantity * unitCost);
    const derivedUnitPrice = money(unitCost * (1 + markupPercent / 100));
    const unitPrice = nonNegative(line.unitPrice ?? derivedUnitPrice, "unitPrice");
    const sell = money(quantity * unitPrice);

    if (line.type === "MATERIAL") materialCost += cost;
    else if (line.type === "LABOR") laborCost += cost;
    else if (line.type === "EQUIPMENT") equipmentCost += cost;
    else if (line.type === "TRAVEL") travelCost += cost;
    else if (line.type === "CONSUMABLE") consumableCost += cost;
    else otherCost += cost;

    sellSubtotal += sell;
    if (line.taxable) taxableSubtotal += sell;
  }

  const laborBurden = money(laborCost * laborBurdenPercent / 100);
  const baseDirectCost = money(materialCost + laborCost + laborBurden + equipmentCost + travelCost + consumableCost + otherCost);
  const contingencyCost = money(baseDirectCost * contingencyPercent / 100);
  const directCost = money(baseDirectCost + contingencyCost);

  // Burden and contingency are real contractor costs. When no explicit sell price is supplied,
  // they are recovered through the global markup so the estimate does not silently underprice labor/risk.
  const overheadRecovery = money((laborBurden + contingencyCost) * (1 + markupPercent / 100));
  sellSubtotal = money(sellSubtotal + overheadRecovery);

  const appliedDiscount = money(Math.min(discountAmount, sellSubtotal));
  const discountedSubtotal = money(sellSubtotal - appliedDiscount);
  taxableSubtotal = money(Math.min(taxableSubtotal, discountedSubtotal));
  const taxAmount = money(taxableSubtotal * (taxPercent / 100));
  const total = money(discountedSubtotal + taxAmount);
  const grossProfit = money(discountedSubtotal - directCost);
  const marginPercent = discountedSubtotal > 0 ? money((grossProfit / discountedSubtotal) * 100) : 0;

  return {
    materialCost: money(materialCost),
    laborCost: money(laborCost),
    laborBurden,
    equipmentCost: money(equipmentCost),
    travelCost: money(travelCost),
    consumableCost: money(consumableCost),
    otherCost: money(otherCost),
    contingencyCost,
    directCost,
    sellSubtotal,
    discountAmount: appliedDiscount,
    taxableSubtotal,
    taxAmount,
    total,
    grossProfit,
    marginPercent,
  };
}

export function createEstimateAuditSnapshot(input: EstimateInput, calculatedAt = new Date().toISOString()): EstimateAuditSnapshot {
  return {
    engineVersion: "1.1",
    calculatedAt,
    input: JSON.parse(JSON.stringify(input)) as EstimateInput,
    totals: calculateEstimate(input),
  };
}

export function calculateCableQuantity(runCount: number, averageRunFeet: number, wastePercent = 10) {
  nonNegative(runCount, "runCount");
  nonNegative(averageRunFeet, "averageRunFeet");
  nonNegative(wastePercent, "wastePercent");
  return Math.ceil(runCount * averageRunFeet * (1 + wastePercent / 100));
}

export function calculateLaborHours(runCount: number, hoursPerRun: number, fixedHours = 0) {
  nonNegative(runCount, "runCount");
  nonNegative(hoursPerRun, "hoursPerRun");
  nonNegative(fixedHours, "fixedHours");
  return money(runCount * hoursPerRun + fixedHours);
}
