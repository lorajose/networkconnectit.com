import assert from "node:assert/strict";
import test from "node:test";

import { seedFieldScopeFromSurvey } from "../../lib/contractor-os/site-survey-field-scope-handoff";
import type { FieldScopeSurveyWorkspace } from "../../lib/contractor-os/site-survey-field-scope-handoff";

const workspace = {
  session: { id: "survey-1", organizationId: "org-1" },
  assignment: {
    disciplinesJson: JSON.stringify(["CCTV"]),
    projectInstallationId: "project-1",
    siteId: "site-1",
  },
  areas: [{ id: "area-1", name: "West Entrance", areaType: "AREA", levelOrder: 0 }],
  points: [{
    id: "point-1",
    areaId: "area-1",
    assetId: null,
    discipline: "CCTV",
    pointType: "CAMERA",
    lifecycle: "PROPOSED",
    label: "CAM-001",
    normalizedX: null,
    normalizedY: null,
    notes: "Exterior brick wall",
    createdAt: new Date(),
  }],
} as unknown as FieldScopeSurveyWorkspace;

test("NCI-013 proposed survey points seed Field Scope without inventing unknowns", () => {
  const seeds = seedFieldScopeFromSurvey(workspace);
  assert.equal(seeds.length, 1);
  const draft = seeds[0].draft;
  assert.equal(draft.stableKey, "CAM-001");
  assert.equal(draft.system, "SURVEILLANCE");
  assert.equal(draft.location.value, "West Entrance");
  assert.equal(draft.deviceType.value, "CAMERA");
  assert.equal(draft.environment.value, null);
  assert.equal(draft.estimatedCableLengthFt.value, null);
  assert.equal(draft.environment.confidence, "LOW");
  assert.equal(draft.missingInformation.includes("destination"), true);
});

test("existing survey points are not converted into proposed commercial scope", () => {
  const existing = {
    ...workspace,
    points: [{ ...workspace.points[0], lifecycle: "EXISTING" }],
  } as FieldScopeSurveyWorkspace;
  assert.equal(seedFieldScopeFromSurvey(existing).length, 0);
});
