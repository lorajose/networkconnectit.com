"use server";

import { headers } from "next/headers";

import { requireUser } from "@/lib/auth";
import { persistProposalApproval } from "@/lib/contractor-os/approval-repository";

export type ProposalApprovalActionInput = {
  organizationId: string;
  proposalId: string;
  proposalVersion: number;
  signerName: string;
  signerEmail?: string;
  acceptanceText: string;
};

export type ProposalApprovalActionResult =
  | {
      ok: true;
      receiptId: string;
      approvedAtIso: string;
      approvedAmount: string;
      signerName: string;
      signerEmail?: string;
    }
  | {
      ok: false;
      error: string;
    };

export async function approveProposalAction(
  input: ProposalApprovalActionInput,
): Promise<ProposalApprovalActionResult> {
  const user = await requireUser();
  const requestHeaders = headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || null;
  const userAgent = requestHeaders.get("user-agent");

  try {
    const receipt = await persistProposalApproval({
      actor: {
        role: user.role,
        organizationId: user.organizationId ?? null,
      },
      organizationId: input.organizationId,
      proposalId: input.proposalId,
      proposalVersion: input.proposalVersion,
      signerName: input.signerName,
      signerEmail: input.signerEmail,
      acceptanceText: input.acceptanceText,
      ipAddress,
      userAgent,
    });

    return {
      ok: true,
      receiptId: receipt.receiptId,
      approvedAtIso: receipt.approvedAtIso,
      approvedAmount: receipt.approvedAmount,
      signerName: receipt.signerName,
      signerEmail: receipt.signerEmail ?? undefined,
    };
  } catch (error) {
    console.error("Proposal approval failed", error);
    return {
      ok: false,
      error: "The proposal could not be approved. Refresh the proposal and try again.",
    };
  }
}
