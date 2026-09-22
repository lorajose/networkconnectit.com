import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const capacitySource = readFileSync(
  resolve(process.cwd(), "lib/management/capacity.ts"),
  "utf8"
);
const surveyAssetRoute = readFileSync(
  resolve(process.cwd(), "app/(protected)/site-surveys/assets/[assetId]/route.ts"),
  "utf8"
);
const workOrderEvidenceRoute = readFileSync(
  resolve(process.cwd(), "app/(protected)/site-surveys/evidence/[evidenceId]/route.ts"),
  "utf8"
);

test("capacity direct-ID reads retain tenant scoping", () => {
  assert.match(
    capacitySource,
    /export async function getSiteCapacitySnapshot[\s\S]*?id:\s*siteId,[\s\S]*?\.\.\.getScopedRecordWhere\(user\)/
  );
  assert.match(
    capacitySource,
    /export async function getProjectCapacitySnapshot[\s\S]*?id:\s*projectId,[\s\S]*?\.\.\.getScopedRecordWhere\(user\)/
  );
});

test("capacity dependent device reads retain the caller tenant scope", () => {
  assert.match(
    capacitySource,
    /getScopedDevices\(\{[\s\S]*?siteId:\s*site\.id,[\s\S]*?\.\.\.getScopedRecordWhere\(user\)/
  );
  assert.match(
    capacitySource,
    /getScopedDevices\(\{[\s\S]*?organizationId:\s*project\.organizationId,[\s\S]*?projectInstallationId:\s*project\.id,[\s\S]*?\.\.\.getScopedRecordWhere\(user\)/
  );
});

test("survey asset direct-ID route requires authenticated scoped access", () => {
  assert.match(surveyAssetRoute, /requireUser\(\)/);
  assert.match(surveyAssetRoute, /requireAssignedTechnicianAccess/);
  assert.match(surveyAssetRoute, /scope:\s*"SURVEY"/);
  assert.match(surveyAssetRoute, /organizationId/);
});

test("work-order evidence direct-ID route requires authenticated exact assignment", () => {
  assert.match(workOrderEvidenceRoute, /requireUser\(\)/);
  assert.match(workOrderEvidenceRoute, /requireAssignedTechnicianAccess/);
  assert.match(workOrderEvidenceRoute, /scope:\s*"WORK_ORDER"/);
  assert.match(workOrderEvidenceRoute, /workOrderId/);
  assert.match(workOrderEvidenceRoute, /organizationId/);
});
