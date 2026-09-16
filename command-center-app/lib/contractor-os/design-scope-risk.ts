import type { DesignTakeoffItem } from "./design-takeoff";
import type { TakeoffItem } from "./takeoff";

export type EstimateEvidenceLine = {
  itemCode?: string | null;
  description: string;
  quantity: number;
  unit: string;
};

export type ScopeRiskEvidence = {
  key: string;
  designQuantity: number;
  takeoffQuantity: number;
  estimateQuantity: number;
  unit: string;
  sourceDesignObjectIds: string[];
  risk: "MATCHED" | "DESIGN_NOT_IN_TAKEOFF" | "TAKEOFF_NOT_IN_ESTIMATE" | "QUANTITY_MISMATCH";
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Evidence-only comparison for the Scope Risk Analyzer. It never changes
 * Design, Takeoff, BOM or Estimate data and keeps Design object IDs visible.
 */
export function compareDesignTakeoffEstimateEvidence(
  design: DesignTakeoffItem[],
  takeoff: TakeoffItem[],
  estimate: EstimateEvidenceLine[],
): ScopeRiskEvidence[] {
  const takeoffByKey = new Map(takeoff.filter((item) => item.itemCode).map((item) => [item.itemCode as string, item]));
  const estimateByKey = new Map(estimate.filter((item) => item.itemCode).map((item) => [item.itemCode as string, item]));

  return design.map((item) => {
    const takeoffItem = takeoffByKey.get(item.key);
    const estimateItem = estimateByKey.get(item.key);
    const designQuantity = round(item.quantity);
    const takeoffQuantity = round(takeoffItem?.effectiveQuantity ?? 0);
    const estimateQuantity = round(estimateItem?.quantity ?? 0);

    let risk: ScopeRiskEvidence["risk"] = "MATCHED";
    if (!takeoffItem) risk = "DESIGN_NOT_IN_TAKEOFF";
    else if (!estimateItem) risk = "TAKEOFF_NOT_IN_ESTIMATE";
    else if (designQuantity !== takeoffQuantity || takeoffQuantity !== estimateQuantity) risk = "QUANTITY_MISMATCH";

    return {
      key: item.key,
      designQuantity,
      takeoffQuantity,
      estimateQuantity,
      unit: item.unit,
      sourceDesignObjectIds: [...item.sourceElementIds],
      risk,
    };
  });
}
