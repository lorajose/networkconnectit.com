import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_CABLE_ROUTE_SETTINGS } from "../lib/contractor-os/cable-route";
import { createCanvasDocument } from "../lib/contractor-os/design-canvas-state";
import { composeDesignReport, issueDesignReport } from "../lib/contractor-os/design-report-composer";

const deviceGeometry = (x: number, y: number) => ({
  schemaVersion: 1 as const,
  points: [{ x, y }],
  width: 20,
  height: 20,
  rotation: 0,
});

function reportDocument() {
  const document = createCanvasDocument();
  document.elements = [
    { id: "cam-1", kind: "DEVICE", discipline: "CCTV", category: "CAMERA", geometry: deviceGeometry(10, 10) },
    { id: "cam-2", kind: "DEVICE", discipline: "CCTV", category: "CAMERA", geometry: deviceGeometry(20, 20) },
    {
      id: "cable-1",
      kind: "CABLE_PATH",
      discipline: "PATHWAY",
      category: "CABLE_ROUTE",
      geometry: { schemaVersion: 1 as const, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], rotation: 0 },
      cableRoute: DEFAULT_CABLE_ROUTE_SETTINGS,
    },
  ];
  return document;
}

test("NCI-065 composes BOM and cable schedule from the same design source", () => {
  const report = composeDesignReport({ floors: [{ id: "f1", name: "Level 1", document: reportDocument() }] });
  assert.equal(report.bom.find((item) => item.key === "CCTV:CAMERA")?.quantity, 2);
  assert.equal(report.cableSchedule.length, 1);
  assert.equal(report.pricingSummary, undefined);
});

test("NCI-065 keeps pricing out of client-safe composition", () => {
  const document = createCanvasDocument();
  document.elements = [{ id: "cam-1", kind: "DEVICE", discipline: "CCTV", category: "CAMERA", geometry: deviceGeometry(10, 10) }];
  const pricing = { materialUnitCostByKey: { "CCTV:CAMERA": 250 } };
  const clientReport = composeDesignReport({ floors: [{ id: "f1", name: "Level 1", document }], profile: { clientSafe: true, includePricing: true, sections: ["BOM", "PRICING_SUMMARY"] }, pricing });
  assert.equal(clientReport.pricingSummary, undefined);
  const internalReport = composeDesignReport({ floors: [{ id: "f1", name: "Level 1", document }], profile: { clientSafe: false, includePricing: true, sections: ["BOM", "PRICING_SUMMARY"] }, pricing });
  assert.equal(internalReport.pricingSummary?.sellSubtotal, 250);
  assert.equal(internalReport.pricingSummary?.total, 250);
});

test("NCI-065 issued reports are revision-bound and linked to commercial evidence", () => {
  const report = composeDesignReport({ floors: [{ id: "f1", name: "Level 1", document: createCanvasDocument([]) }], source: { proposalId: "proposal-42" } });
  const issued = issueDesignReport({ projectId: "design-1", revision: 7, composition: report, issuedByUserId: "user-1", issuedAt: "2026-09-16T16:00:00.000Z" });
  assert.equal(issued.status, "ISSUED");
  assert.equal(issued.revision, 7);
  assert.equal(issued.source.proposalId, "proposal-42");
  assert.equal(Object.isFrozen(issued), true);
  assert.equal(Object.isFrozen(issued.composition), true);
});

test("NCI-065 refuses to issue without Estimate or Proposal evidence", () => {
  const report = composeDesignReport({ floors: [{ id: "f1", name: "Level 1", document: createCanvasDocument([]) }] });
  assert.throws(() => issueDesignReport({ projectId: "design-1", revision: 1, composition: report, issuedByUserId: "user-1" }), /Estimate or Proposal/i);
});
