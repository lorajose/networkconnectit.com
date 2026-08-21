export type CostLineType = "MATERIAL" | "LABOR" | "EQUIPMENT" | "OTHER";

export type CostLineInput = {
  type: CostLineType;
  description: string;
  quantity: number;
  unitCost: number;
  unitPrice?: number;
  taxable?: boolean;
};

export type EstimateInput = {
  lines: CostLineInput[];
  markupPercent?: number;
  taxPercent?: number;
  discountAmount?: number;
};

export type EstimateTotals = {
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  otherCost: number;
  directCost: number;
  sellSubtotal: number;
  discountAmount: number;
  taxableSubtotal: number;
  taxAmount: number;
  total: number;
  grossProfit: number;
  marginPercent: number;
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

  let materialCost = 0;
  let laborCost = 0;
  let equipmentCost = 0;
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
    else otherCost += cost;

    sellSubtotal += sell;
    if (line.taxable) taxableSubtotal += sell;
  }

  const directCost = money(materialCost + laborCost + equipmentCost + otherCost);
  sellSubtotal = money(sellSubtotal);
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
    equipmentCost: money(equipmentCost),
    otherCost: money(otherCost),
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
