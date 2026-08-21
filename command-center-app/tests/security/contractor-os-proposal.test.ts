import test from "node:test";
import assert from "node:assert/strict";
import { calculateEstimate } from "../../lib/contractor-os/cost-engine";
import { buildProposalDocument, proposalSnapshot } from "../../lib/contractor-os/proposal";

const totals = calculateEstimate({
  markupPercent: 35,
  taxPercent: 8.625,
  laborBurdenPercent: 18,
  contingencyPercent: 5,
  lines: [
    { type: "MATERIAL", description: "4K IP Camera", quantity: 8, unitCost: 145, taxable: true, unit: "ea" },
    { type: "LABOR", description: "Installation labor", quantity: 24, unitCost: 55, taxable: false, unit: "hr" },
  ],
});

test("builds a client-facing proposal from deterministic estimate totals", () => {
  const document = buildProposalDocument({
    proposalNumber: "NCI-P-1001",
    title: "16 Camera CCTV Upgrade",
    branding: { companyName: "NetworkConnectIT LLC", website: "networkconnectit.com" },
    customer: { companyName: "Smith Dental Office", contactName: "Jane Smith" },
    scopeSummary: "Provide and install a managed IP video surveillance solution.",
    lines: [{ description: "CCTV system installation", quantity: 1, unit: "project", unitPrice: totals.sellSubtotal, amount: totals.sellSubtotal }],
    totals,
    paymentTerms: "50% deposit, balance due at substantial completion.",
    warranty: "One-year workmanship warranty.",
    createdAt: new Date("2026-08-21T12:00:00.000Z"),
  });

  assert.equal(document.customerTotal, totals.total);
  assert.equal(document.customerTax, totals.taxAmount);
  assert.equal(document.validUntilIso, "2026-09-20T12:00:00.000Z");
  assert.match(document.scopeSummary, /surveillance/);
});

test("proposal snapshots are reproducible for audit/history", () => {
  const input = {
    proposalNumber: "NCI-P-1002",
    title: "Access Control Installation",
    branding: { companyName: "NetworkConnectIT LLC" },
    customer: { companyName: "Demo Customer" },
    scopeSummary: "Install access control at two exterior doors.",
    lines: [{ description: "Access control project", quantity: 1, unit: "project", unitPrice: totals.sellSubtotal, amount: totals.sellSubtotal }],
    totals,
    createdAt: new Date("2026-08-21T12:00:00.000Z"),
  };

  assert.equal(proposalSnapshot(buildProposalDocument(input)), proposalSnapshot(buildProposalDocument(input)));
});

test("rejects incomplete commercial proposals", () => {
  assert.throws(() => buildProposalDocument({
    proposalNumber: "",
    title: "Test",
    branding: { companyName: "NetworkConnectIT LLC" },
    customer: { companyName: "Customer" },
    scopeSummary: "Scope",
    lines: [{ description: "Project", quantity: 1, unit: "job", unitPrice: 1, amount: 1 }],
    totals,
  }), /proposalNumber/);
});
