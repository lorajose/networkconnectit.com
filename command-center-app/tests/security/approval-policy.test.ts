import assert from "node:assert/strict";
import test from "node:test";

import { assertProposalCanBeApproved, normalizeApprovalSubmission } from "../../lib/contractor-os/approval-policy";

test("normalizes signer identity and acceptance text", () => {
  assert.deepEqual(
    normalizeApprovalSubmission({
      signerName: "  Jane Smith  ",
      signerEmail: "  Jane@Example.COM ",
      acceptanceText: "  I approve this proposal.  ",
    }),
    {
      signerName: "Jane Smith",
      signerEmail: "jane@example.com",
      acceptanceText: "I approve this proposal.",
    },
  );
});

test("rejects invalid approval identity", () => {
  assert.throws(
    () => normalizeApprovalSubmission({ signerName: "", acceptanceText: "Accepted" }),
    /Signer name is required/,
  );

  assert.throws(
    () => normalizeApprovalSubmission({ signerName: "Jane", signerEmail: "invalid", acceptanceText: "Accepted" }),
    /Signer email is invalid/,
  );
});

test("only current sent or viewed proposal versions can be approved", () => {
  assert.doesNotThrow(() => assertProposalCanBeApproved("SENT", 2, 2));
  assert.doesNotThrow(() => assertProposalCanBeApproved("VIEWED", 2, 2));
  assert.throws(() => assertProposalCanBeApproved("DRAFT", 2, 2), /cannot be approved/);
  assert.throws(() => assertProposalCanBeApproved("APPROVED", 2, 2), /cannot be approved/);
  assert.throws(() => assertProposalCanBeApproved("VIEWED", 3, 2), /no longer current/);
});
