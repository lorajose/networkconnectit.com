export type CommercialDocumentStatus =
  | "DRAFT"
  | "READY"
  | "SENT"
  | "VIEWED"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED";

export type ApprovalEvent =
  | "MARK_READY"
  | "SEND"
  | "VIEW"
  | "APPROVE"
  | "REJECT"
  | "EXPIRE"
  | "REOPEN";

const transitions: Record<CommercialDocumentStatus, Partial<Record<ApprovalEvent, CommercialDocumentStatus>>> = {
  DRAFT: { MARK_READY: "READY" },
  READY: { SEND: "SENT", REOPEN: "DRAFT" },
  SENT: { VIEW: "VIEWED", APPROVE: "APPROVED", REJECT: "REJECTED", EXPIRE: "EXPIRED" },
  VIEWED: { APPROVE: "APPROVED", REJECT: "REJECTED", EXPIRE: "EXPIRED" },
  APPROVED: {},
  REJECTED: { REOPEN: "DRAFT" },
  EXPIRED: { REOPEN: "DRAFT" },
};

export function transitionCommercialStatus(status: CommercialDocumentStatus, event: ApprovalEvent) {
  const next = transitions[status][event];
  if (!next) throw new Error(`Invalid commercial transition: ${status} -> ${event}`);
  return next;
}

export type ProposalVersionInput = {
  proposalId: string;
  version: number;
  snapshot: string;
  customerTotal: number;
  createdAt: Date;
};

export function proposalVersionKey(input: ProposalVersionInput) {
  if (!input.proposalId.trim()) throw new Error("proposalId is required");
  if (!Number.isInteger(input.version) || input.version < 1) throw new Error("version must be >= 1");
  if (!Number.isFinite(input.customerTotal) || input.customerTotal < 0) throw new Error("customerTotal must be non-negative");
  return `${input.proposalId}:v${input.version}:${input.createdAt.toISOString()}:${input.customerTotal.toFixed(2)}:${input.snapshot}`;
}

export function shouldCreateNewProposalVersion(previousSnapshot: string | null, nextSnapshot: string) {
  return previousSnapshot !== nextSnapshot;
}

export type ApprovalReceiptInput = {
  proposalId: string;
  proposalVersion: number;
  signerName: string;
  signerEmail?: string;
  approvedAt: Date;
  customerTotal: number;
};

export function buildApprovalReceipt(input: ApprovalReceiptInput) {
  if (!input.proposalId.trim()) throw new Error("proposalId is required");
  if (input.proposalVersion < 1) throw new Error("proposalVersion must be >= 1");
  if (!input.signerName.trim()) throw new Error("signerName is required");
  if (!Number.isFinite(input.customerTotal) || input.customerTotal < 0) throw new Error("customerTotal must be non-negative");

  return {
    ...input,
    approvedAtIso: input.approvedAt.toISOString(),
    immutableReference: `${input.proposalId}:v${input.proposalVersion}:${input.approvedAt.toISOString()}`,
  };
}
