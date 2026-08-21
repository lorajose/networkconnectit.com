import test from "node:test";
import assert from "node:assert/strict";
import { calculateEstimate } from "../../lib/contractor-os/cost-engine";

test("calculates CCTV material and labor estimate with markup and tax", () => {
  const result = calculateEstimate({
    markupPercent: 25,
    taxPercent: 8.625,
    lines: [
      { type: "MATERIAL", description: "4K camera", quantity: 8, unitCost: 100, taxable: true },
      { type: "MATERIAL", description: "16ch NVR", quantity: 1, unitCost: 400, taxable: true },
      { type: "LABOR", description: "Installation labor", quantity: 16, unitCost: 50, taxable: false },
    ],
  });

  assert.equal(result.materialCost, 1200);
  assert.equal(result.laborCost, 800);
  assert.equal(result.directCost, 2000);
  assert.equal(result.sellSubtotal, 2500);
  assert.equal(result.taxableSubtotal, 1500);
  assert.equal(result.taxAmount, 129.38);
  assert.equal(result.total, 2629.38);
  assert.equal(result.grossProfit, 500);
  assert.equal(result.marginPercent, 20);
});

test("supports explicit sell prices and discounts", () => {
  const result = calculateEstimate({
    taxPercent: 10,
    discountAmount: 100,
    lines: [{ type: "MATERIAL", description: "Camera", quantity: 2, unitCost: 100, unitPrice: 200, taxable: true }],
  });

  assert.equal(result.directCost, 200);
  assert.equal(result.sellSubtotal, 400);
  assert.equal(result.discountAmount, 100);
  assert.equal(result.taxableSubtotal, 300);
  assert.equal(result.taxAmount, 30);
  assert.equal(result.total, 330);
  assert.equal(result.grossProfit, 100);
  assert.equal(result.marginPercent, 33.33);
});

test("rejects negative financial inputs", () => {
  assert.throws(() => calculateEstimate({ lines: [{ type: "LABOR", description: "Labor", quantity: -1, unitCost: 50 }] }), /quantity/);
});
