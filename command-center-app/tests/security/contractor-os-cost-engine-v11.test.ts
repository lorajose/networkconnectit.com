import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateCableQuantity,
  calculateEstimate,
  calculateLaborHours,
  createEstimateAuditSnapshot,
} from "../../lib/contractor-os/cost-engine";

test("calculates cable quantity with waste", () => {
  assert.equal(calculateCableQuantity(8, 150, 10), 1320);
});

test("calculates installation labor hours", () => {
  assert.equal(calculateLaborHours(8, 2.25, 6), 24);
});

test("recovers labor burden and contingency instead of hiding them", () => {
  const result = calculateEstimate({
    markupPercent: 25,
    laborBurdenPercent: 20,
    contingencyPercent: 5,
    lines: [{ type: "LABOR", description: "Tech labor", quantity: 10, unitCost: 50 }],
  });

  assert.equal(result.laborCost, 500);
  assert.equal(result.laborBurden, 100);
  assert.equal(result.contingencyCost, 30);
  assert.equal(result.directCost, 630);
  assert.equal(result.sellSubtotal, 787.5);
  assert.equal(result.grossProfit, 157.5);
  assert.equal(result.marginPercent, 20);
});

test("creates reproducible audit snapshot", () => {
  const input = {
    markupPercent: 30,
    lines: [{ type: "MATERIAL" as const, description: "Camera", quantity: 4, unitCost: 100, taxable: true }],
  };
  const snapshot = createEstimateAuditSnapshot(input, "2026-08-21T12:00:00.000Z");

  assert.equal(snapshot.engineVersion, "1.1");
  assert.equal(snapshot.calculatedAt, "2026-08-21T12:00:00.000Z");
  assert.deepEqual(snapshot.input, input);
  assert.deepEqual(snapshot.totals, calculateEstimate(input));
});
