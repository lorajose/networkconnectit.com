import assert from "node:assert/strict";
import test from "node:test";

import { issueDesignReport, verifyIssuedDesignReport } from "../lib/contractor-os/design-report-issuance";
import { DEFAULT_CLIENT_DESIGN_REPORT_PROFILE } from "../lib/contractor-os/design-report-profile";

const model = { sections: DEFAULT_CLIENT_DESIGN_REPORT_PROFILE.sections, floors: [], bom: [], cableSchedule: [], pricingVisible: false };

test("issued design reports are versioned, linked and integrity-verifiable", () => {
  const first = issueDesignReport({ organizationId: "org-1", projectId: "project-1", issuedByUserId: "user-1", profile: DEFAULT_CLIENT_DESIGN_REPORT_PROFILE, model, commercialLink: { estimateId: "estimate-1", proposalId: "proposal-1" }, issuedAt: "2026-09-16T12:00:00.000Z" });
  assert.equal(first.version, 1);
  assert.equal(first.commercialLink.estimateId, "estimate-1");
  assert.equal(verifyIssuedDesignReport(first), true);

  const second = issueDesignReport({ organizationId: "org-1", projectId: "project-1", issuedByUserId: "user-2", profile: DEFAULT_CLIENT_DESIGN_REPORT_PROFILE, model, commercialLink: { estimateId: "estimate-1", proposalId: "proposal-1" }, previousIssue: first, issuedAt: "2026-09-16T13:00:00.000Z" });
  assert.equal(second.version, 2);
  assert.equal(second.previousIssueId, first.id);
  assert.notEqual(second.digest, first.digest);
  assert.equal(verifyIssuedDesignReport(second), true);
});

test("tampering with issued report evidence invalidates its digest", () => {
  const issued = issueDesignReport({ organizationId: "org-1", projectId: "project-1", issuedByUserId: "user-1", profile: DEFAULT_CLIENT_DESIGN_REPORT_PROFILE, model, commercialLink: {}, issuedAt: "2026-09-16T12:00:00.000Z" });
  const tampered = { ...issued, projectId: "project-2" };
  assert.equal(verifyIssuedDesignReport(tampered), false);
});
