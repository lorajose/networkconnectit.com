import { createHash } from "node:crypto";

import type { DesignReportModel } from "./design-report-model";
import type { DesignReportProfile } from "./design-report-profile";

export type DesignReportCommercialLink = { estimateId?: string; proposalId?: string };
export type IssuedDesignReport = {
  id: string; version: number; issuedAt: string; issuedByUserId: string; projectId: string; organizationId: string;
  profile: DesignReportProfile; model: DesignReportModel; commercialLink: DesignReportCommercialLink; previousIssueId?: string; digest: string;
};
type IssueDesignReportInput = Omit<IssuedDesignReport, "id" | "version" | "issuedAt" | "digest" | "previousIssueId"> & { previousIssue?: IssuedDesignReport; issuedAt?: string };

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function issueDesignReport(input: IssueDesignReportInput): IssuedDesignReport {
  if (!input.organizationId.trim() || !input.projectId.trim() || !input.issuedByUserId.trim()) throw new Error("Organization, project and issuing user are required");
  if (input.profile.clientSafe && (input.profile.includePricing || input.profile.sections.includes("PRICING_SUMMARY") || input.model.pricingVisible)) throw new Error("Client-safe issued reports cannot contain pricing");
  if (input.previousIssue && (input.previousIssue.organizationId !== input.organizationId || input.previousIssue.projectId !== input.projectId)) throw new Error("Previous issued report belongs to a different project");
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  const version = (input.previousIssue?.version ?? 0) + 1;
  const immutablePayload = { organizationId: input.organizationId, projectId: input.projectId, version, issuedAt, issuedByUserId: input.issuedByUserId, profile: input.profile, model: input.model, commercialLink: input.commercialLink, previousIssueId: input.previousIssue?.id };
  const digest = createHash("sha256").update(stable(immutablePayload)).digest("hex");
  return { ...immutablePayload, id: `design-report:${input.projectId}:v${version}:${digest.slice(0, 16)}`, digest };
}

export function verifyIssuedDesignReport(report: IssuedDesignReport): boolean {
  if (report.profile.clientSafe && (report.profile.includePricing || report.profile.sections.includes("PRICING_SUMMARY") || report.model.pricingVisible)) return false;
  const payload = { organizationId: report.organizationId, projectId: report.projectId, version: report.version, issuedAt: report.issuedAt, issuedByUserId: report.issuedByUserId, profile: report.profile, model: report.model, commercialLink: report.commercialLink, previousIssueId: report.previousIssueId };
  return createHash("sha256").update(stable(payload)).digest("hex") === report.digest;
}
