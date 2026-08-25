import type { CommercialDocumentStatus } from "./commercial-workflow";

export type ApprovalSubmission = {
  signerName: string;
  signerEmail?: string;
  acceptanceText: string;
};

export function normalizeApprovalSubmission(input: ApprovalSubmission) {
  const signerName = input.signerName.trim();
  const signerEmail = input.signerEmail?.trim().toLowerCase() || null;
  const acceptanceText = input.acceptanceText.trim();

  if (!signerName) throw new Error("Signer name is required");
  if (!acceptanceText) throw new Error("Acceptance text is required");

  if (signerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail)) {
    throw new Error("Signer email is invalid");
  }

  return { signerName, signerEmail, acceptanceText };
}

export function assertProposalCanBeApproved(status: CommercialDocumentStatus, currentVersion: number, requestedVersion: number) {
  if (status !== "SENT" && status !== "VIEWED") {
    throw new Error(`Proposal cannot be approved from ${status}`);
  }

  if (!Number.isInteger(requestedVersion) || requestedVersion < 1) {
    throw new Error("Proposal version must be >= 1");
  }

  if (currentVersion !== requestedVersion) {
    throw new Error("Proposal version is no longer current");
  }
}
