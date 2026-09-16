import assert from "node:assert/strict";
import test from "node:test";

import { approveDesignTakeoffProposal } from "../../lib/contractor-os/design-takeoff-handoff";
import type { ProposedDesignTakeoffSnapshot } from "../../lib/contractor-os/design-takeoff";

const proposal: ProposedDesignTakeoffSnapshot = {
  id: "proposal-1",
  generatedAt: "2026-09-15T21:00:00.000Z",
  status: "PROPOSED",
  requiresHumanApproval: true,
  items: [
    { key: "CCTV:CAMERA", discipline: "CCTV", category: "CAMERA", description: "CCTV CAMERA", quantity: 4, unit: "EA", sourceElementIds: ["cam-1", "cam-2", "cam-3", "cam-4"] },
    { key: "CABLE:CAT6", discipline: "PATHWAY", category: "CABLE_ROUTE", description: "CAT6 cable", quantity: 420, unit: "FT", sourceElementIds: ["route-1", "route-2"] },
  ],
};

test("reviewed handoff only emits explicitly approved rows for existing Takeoff", () => {
  const handoff = approveDesignTakeoffProposal(proposal, {
    proposalId: proposal.id,
    approvedBy: "reviewer-1",
    approvedAt: "2026-09-15T21:05:00.000Z",
    approvedItemKeys: ["CABLE:CAT6"],
  });
  assert.equal(handoff.items.length, 1);
  assert.equal(handoff.items[0].category, "COPPER");
  assert.equal(handoff.items[0].countedQuantity, 420);
  assert.equal(handoff.items[0].source, "AI_SUGGESTED");
  assert.match(handoff.items[0].notes ?? "", /route-1, route-2/);
});

test("handoff refuses a review for another proposal", () => {
  assert.throws(() => approveDesignTakeoffProposal(proposal, {
    proposalId: "wrong-proposal",
    approvedBy: "reviewer-1",
    approvedAt: "2026-09-15T21:05:00.000Z",
    approvedItemKeys: ["CCTV:CAMERA"],
  }), /does not match/);
});

test("handoff refuses unknown approved rows", () => {
  assert.throws(() => approveDesignTakeoffProposal(proposal, {
    proposalId: proposal.id,
    approvedBy: "reviewer-1",
    approvedAt: "2026-09-15T21:05:00.000Z",
    approvedItemKeys: ["NOT-IN-PROPOSAL"],
  }), /unknown Design Takeoff item keys/);
});
