import assert from "node:assert/strict";
import test from "node:test";

import { createProposedDesignTakeoffSnapshot, buildDesignTakeoff } from "../../lib/contractor-os/design-takeoff";
import { approveDesignTakeoffProposal } from "../../lib/contractor-os/design-takeoff-handoff";
import { compareDesignTakeoffEstimateEvidence } from "../../lib/contractor-os/design-scope-risk";
import { buildProposalDocument, proposalSnapshot } from "../../lib/contractor-os/proposal";
import type { CanvasDocument } from "../../lib/contractor-os/design-canvas-state";

const document: CanvasDocument = {
  schemaVersion: 1,
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedIds: [],
  layers: { schemaVersion: 1, layers: [] },
  elements: [
    {
      id: "cam-1",
      kind: "DEVICE",
       hidden: false,
      locked: false,
      discipline: "CCTV",
      category: "CAMERA",
      geometry: { schemaVersion: 1, points: [{ x: 10, y: 10 }] },
    },
    {
      id: "route-1",
      kind: "CABLE_PATH",
       hidden: false,
      locked: false,
      discipline: "PATHWAY",
      category: "CABLE_ROUTE",
      geometry: { schemaVersion: 1, points: [{ x: 0, y: 0 }, { x: 20, y: 0 }] },
      cableRoute: {
        cableType: "CAT6",
        factors: { verticalRiseMeters: 0, serviceLoopMeters: 0, wastePercent: 0 },
      },
    },
  ],
};

test("NCI-073 Design to Takeoff/BOM to Estimate to Proposal preserves reviewed scope and customer-safe economics", () => {
  const proposed = createProposedDesignTakeoffSnapshot(document, 0.5, "2026-09-25T20:00:00.000Z");
  assert.equal(proposed.status, "PROPOSED");
  assert.equal(proposed.requiresHumanApproval, true);
  assert.equal(proposed.items.length, 2);

  const approved = approveDesignTakeoffProposal(proposed, {
    proposalId: proposed.id,
    approvedBy: "qa-reviewer",
    approvedAt: "2026-09-25T20:01:00.000Z",
    approvedItemKeys: proposed.items.map((item) => item.key),
  });
  assert.equal(approved.items.length, 2);

  const priced = buildDesignTakeoff(document, {
    materialUnitCostByKey: {
      "CCTV:CAMERA": 150,
      "CABLE:CAT6": 0.25,
    },
    laborHoursPerDevice: 2,
    laborHourlyCost: 60,
    markupPercent: 30,
    laborBurdenPercent: 15,
    contingencyPercent: 5,
  }, 0.5);
  assert.ok(priced.totals.directCost > 0);
  assert.ok(priced.totals.total > priced.totals.directCost);

  const estimateEvidence = priced.items.map((item) => ({
    itemCode: item.key,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
  }));
  const risks = compareDesignTakeoffEstimateEvidence(proposed.items, approved.items, estimateEvidence);
  assert.ok(risks.every((row) => row.risk === "MATCHED"));

  const proposal = buildProposalDocument({
    proposalNumber: "NCI-QA-073",
    title: "Design Studio QA Proposal",
    branding: { companyName: "QA Contractor" },
    customer: { companyName: "QA Customer" },
    scopeSummary: "Reviewed Design Studio scope.",
    lines: [{
      description: "Reviewed design scope",
      quantity: 1,
      unit: "project",
      unitPrice: priced.totals.sellSubtotal,
      amount: priced.totals.sellSubtotal,
    }],
    totals: priced.totals,
    createdAt: new Date("2026-09-25T20:02:00.000Z"),
  });

  assert.equal(proposal.customerTotal, priced.totals.total);
  const customerSnapshot = proposalSnapshot(proposal);
  assert.doesNotMatch(customerSnapshot, /directCost|grossProfit|marginPercent|laborBurden|contingencyCost/);
});

test("NCI-073 handoff cannot bypass human review", () => {
  const proposed = createProposedDesignTakeoffSnapshot(document, 0.5, "2026-09-25T20:00:00.000Z");
  assert.throws(() => approveDesignTakeoffProposal(proposed, {
    proposalId: proposed.id,
    approvedBy: "",
    approvedAt: "2026-09-25T20:01:00.000Z",
    approvedItemKeys: proposed.items.map((item) => item.key),
  }), /Reviewer identity is required/);
});
