import test from "node:test";
import assert from "node:assert/strict";
import {
  buildApprovalReceipt,
  proposalVersionKey,
  shouldCreateNewProposalVersion,
  transitionCommercialStatus,
} from "../../lib/contractor-os/commercial-workflow";

test("proposal approval follows explicit lifecycle", () => {
  assert.equal(transitionCommercialStatus("DRAFT", "MARK_READY"), "READY");
  assert.equal(transitionCommercialStatus("READY", "SEND"), "SENT");
  assert.equal(transitionCommercialStatus("SENT", "VIEW"), "VIEWED");
  assert.equal(transitionCommercialStatus("VIEWED", "APPROVE"), "APPROVED");
});

test("approved proposals cannot be silently reopened", () => {
  assert.throws(() => transitionCommercialStatus("APPROVED", "REOPEN"), /Invalid commercial transition/);
});

test("new proposal version is created only when customer snapshot changes", () => {
  assert.equal(shouldCreateNewProposalVersion("snapshot-a", "snapshot-a"), false);
  assert.equal(shouldCreateNewProposalVersion("snapshot-a", "snapshot-b"), true);
  assert.equal(shouldCreateNewProposalVersion(null, "snapshot-a"), true);
});

test("proposal version keys are deterministic", () => {
  const input = {
    proposalId: "proposal-1",
    version: 2,
    snapshot: "scope-and-price",
    customerTotal: 12500,
    createdAt: new Date("2026-08-21T19:00:00.000Z"),
  };
  assert.equal(proposalVersionKey(input), proposalVersionKey(input));
});

test("approval receipt preserves signed commercial version", () => {
  const receipt = buildApprovalReceipt({
    proposalId: "proposal-1",
    proposalVersion: 3,
    signerName: "Jane Customer",
    signerEmail: "jane@example.com",
    approvedAt: new Date("2026-08-21T19:10:00.000Z"),
    customerTotal: 14250.5,
  });
  assert.equal(receipt.proposalVersion, 3);
  assert.equal(receipt.customerTotal, 14250.5);
  assert.match(receipt.immutableReference, /proposal-1:v3/);
});
