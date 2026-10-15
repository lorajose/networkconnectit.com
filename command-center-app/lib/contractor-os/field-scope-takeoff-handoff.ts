import type { ReviewedFieldScope } from "./field-scope";
import { fieldScopeToTakeoffSuggestions, validateFieldScopeDraft } from "./field-scope";
import type { TakeoffItemInput } from "./takeoff";

export type ApprovedFieldScopeHandoff = {
  handoffId: string;
  surveySessionId: string;
  approvedBy: string;
  approvedAt: string;
  items: TakeoffItemInput[];
};

/**
 * Converts already human-reviewed Field Scope rows into an immutable handoff
 * contract for the existing Takeoff/BOM repository layer.
 * No pricing or commercial arithmetic is performed here.
 */
export function approveFieldScopeForTakeoff(input: {
  surveySessionId: string;
  reviewedScopes: ReviewedFieldScope[];
  approvedStableKeys: string[];
  approvedBy: string;
  approvedAt: string;
}): ApprovedFieldScopeHandoff {
  if (!input.surveySessionId.trim()) throw new Error("Survey session is required");
  if (!input.approvedBy.trim()) throw new Error("Reviewer identity is required");
  if (!input.approvedAt.trim() || Number.isNaN(Date.parse(input.approvedAt))) throw new Error("Valid review timestamp is required");

  const keys = new Set(input.approvedStableKeys.map((key) => key.trim()).filter(Boolean));
  if (!keys.size) throw new Error("Approve at least one Field Scope item before applying");

  const matching = input.reviewedScopes.filter((scope) => {
    validateFieldScopeDraft(scope);
    if (scope.surveySessionId !== input.surveySessionId) throw new Error("Field Scope belongs to a different survey session");
    if (!scope.reviewedByUserId.trim() || !scope.reviewedAt.trim()) throw new Error("Field Scope requires human review");
    return keys.has(scope.stableKey);
  });

  const known = new Set(input.reviewedScopes.map((scope) => scope.stableKey));
  const unknown = [...keys].filter((key) => !known.has(key));
  if (unknown.length) throw new Error(`Review contains unknown Field Scope keys: ${unknown.join(", ")}`);

  const handoffId = `FIELD-SCOPE:${input.surveySessionId}`;
  return {
    handoffId,
    surveySessionId: input.surveySessionId,
    approvedBy: input.approvedBy.trim(),
    approvedAt: input.approvedAt,
    items: matching.flatMap(fieldScopeToTakeoffSuggestions).map((item) => ({
      ...item,
      notes: `Field Scope handoff ${handoffId}; ${item.notes ?? ""}`.trim(),
    })),
  };
}
