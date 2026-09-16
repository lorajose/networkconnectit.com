import type { DesignTakeoffItem, ProposedDesignTakeoffSnapshot } from "./design-takeoff";
import { normalizeTakeoffItem, type TakeoffCategory, type TakeoffItemInput } from "./takeoff";

export type DesignTakeoffReviewDecision = {
  proposalId: string;
  approvedBy: string;
  approvedAt: string;
  approvedItemKeys: string[];
};

export type ApprovedDesignTakeoffHandoff = {
  proposalId: string;
  approvedBy: string;
  approvedAt: string;
  items: TakeoffItemInput[];
};

function categoryFor(item: DesignTakeoffItem): TakeoffCategory {
  if (item.key.startsWith("CABLE:")) {
    const cable = item.key.slice("CABLE:".length).toUpperCase();
    if (cable === "FIBER") return "FIBER";
    if (cable === "CAT6" || cable === "CAT6A" || cable === "COAX") return "COPPER";
    return "STRUCTURED_CABLING";
  }
  if (item.discipline === "CCTV") return "CCTV";
  if (item.discipline === "ACCESS_CONTROL") return "ACCESS_CONTROL";
  if (item.discipline === "NETWORK") return "NETWORK_EQUIPMENT";
  if (item.discipline === "PATHWAY") return "PATHWAY";
  return "OTHER";
}

export function designTakeoffItemToAuthoritativeInput(item: DesignTakeoffItem, proposalId: string): TakeoffItemInput {
  return normalizeTakeoffItem({
    category: categoryFor(item),
    itemCode: item.key,
    description: item.description,
    unit: item.unit,
    countedQuantity: item.quantity,
    notes: `Design proposal ${proposalId}; source design objects: ${item.sourceElementIds.join(", ")}`,
    source: "AI_SUGGESTED",
  });
}

/**
 * Converts only explicitly approved proposed rows into the existing NCI-043
 * Takeoff input contract. This function does not write to the repository.
 */
export function approveDesignTakeoffProposal(
  proposal: ProposedDesignTakeoffSnapshot,
  decision: DesignTakeoffReviewDecision,
): ApprovedDesignTakeoffHandoff {
  if (proposal.status !== "PROPOSED" || !proposal.requiresHumanApproval) {
    throw new Error("Only a human-reviewed proposed Design Takeoff can be handed off");
  }
  if (decision.proposalId !== proposal.id) throw new Error("Review decision does not match the proposed Design Takeoff");
  if (!decision.approvedBy.trim()) throw new Error("Reviewer identity is required");
  if (!decision.approvedAt.trim()) throw new Error("Review timestamp is required");

  const approved = new Set(decision.approvedItemKeys);
  const unknown = [...approved].filter((key) => !proposal.items.some((item) => item.key === key));
  if (unknown.length) throw new Error(`Review contains unknown Design Takeoff item keys: ${unknown.join(", ")}`);

  return {
    proposalId: proposal.id,
    approvedBy: decision.approvedBy.trim(),
    approvedAt: decision.approvedAt,
    items: proposal.items
      .filter((item) => approved.has(item.key))
      .map((item) => designTakeoffItemToAuthoritativeInput(item, proposal.id)),
  };
}
