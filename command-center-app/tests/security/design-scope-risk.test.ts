import assert from "node:assert/strict";
import test from "node:test";

import { compareDesignTakeoffEstimateEvidence } from "../../lib/contractor-os/design-scope-risk";

test("scope risk evidence compares design takeoff and estimate without mutating sources", () => {
  const design = [{ key: "CCTV:CAMERA", discipline: "CCTV", category: "CAMERA", description: "Camera", quantity: 4, unit: "EA" as const, sourceElementIds: ["cam-1", "cam-2", "cam-3", "cam-4"] }];
  const takeoff = [{ id: "t1", category: "CCTV" as const, itemCode: "CCTV:CAMERA", description: "Camera", unit: "EA", countedQuantity: 4, overrideQuantity: null, effectiveQuantity: 4, sheetReference: null, drawingRevision: null, notes: null, source: "AI_SUGGESTED" as const, bom: [] }];
  const estimate = [{ itemCode: "CCTV:CAMERA", description: "Camera", quantity: 4, unit: "EA" }];
  const evidence = compareDesignTakeoffEstimateEvidence(design, takeoff, estimate);
  assert.equal(evidence[0].risk, "MATCHED");
  assert.deepEqual(evidence[0].sourceDesignObjectIds, design[0].sourceElementIds);
});

test("scope risk flags missing takeoff, missing estimate and quantity mismatch", () => {
  const design = [{ key: "CABLE:CAT6", description: "CAT6", quantity: 500, unit: "FT" as const, sourceElementIds: ["route-1"] }];
  assert.equal(compareDesignTakeoffEstimateEvidence(design, [], [])[0].risk, "DESIGN_NOT_IN_TAKEOFF");

  const takeoff = [{ id: "t1", category: "COPPER" as const, itemCode: "CABLE:CAT6", description: "CAT6", unit: "FT", countedQuantity: 500, overrideQuantity: null, effectiveQuantity: 500, sheetReference: null, drawingRevision: null, notes: null, source: "AI_SUGGESTED" as const, bom: [] }];
  assert.equal(compareDesignTakeoffEstimateEvidence(design, takeoff, [])[0].risk, "TAKEOFF_NOT_IN_ESTIMATE");
  assert.equal(compareDesignTakeoffEstimateEvidence(design, takeoff, [{ itemCode: "CABLE:CAT6", description: "CAT6", quantity: 450, unit: "FT" }])[0].risk, "QUANTITY_MISMATCH");
});
