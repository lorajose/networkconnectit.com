import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const surveyPage = readFileSync(resolve(process.cwd(), "app/(protected)/site-surveys/[sessionId]/page.tsx"), "utf8");
const reportPage = readFileSync(resolve(process.cwd(), "app/(protected)/site-surveys/[sessionId]/report/page.tsx"), "utf8");
const repository = readFileSync(resolve(process.cwd(), "lib/contractor-os/site-survey-repository.ts"), "utf8");
const connectivity = readFileSync(resolve(process.cwd(), "docs/site-survey-connectivity.md"), "utf8");

test("NCI-013 retains mobile camera capture and structured survey fields", () => {
  assert.match(surveyPage, /capture="environment"/);
  assert.match(surveyPage, /updateSurveyChecklistAction/);
  assert.match(surveyPage, /createSurveyAreaAction/);
  assert.match(surveyPage, /createSurveyMeasurementAction/);
  assert.match(surveyPage, /createSurveyPointAction/);
});

test("NCI-013 survey persistence remains project and site scoped", () => {
  assert.match(repository, /projectInstallationId/);
  assert.match(repository, /siteId/);
  assert.match(repository, /ProjectInstallation/);
  assert.match(repository, /ProjectSite/);
  assert.match(repository, /organizationId/);
});

test("NCI-013 report output is authenticated and tenant scoped", () => {
  assert.match(reportPage, /requireUser\(\)/);
  assert.match(reportPage, /requireSiteSurveyPageAccess/);
  assert.match(reportPage, /getSurveySessionWorkspace/);
  assert.match(reportPage, /Site Survey Report/);
  assert.match(reportPage, /Photo evidence/);
  assert.match(reportPage, /Print \/ Save as PDF/);
});

test("NCI-013 poor-connectivity behavior is explicit and server acknowledged", () => {
  assert.match(connectivity, /does not provide background synchronization or an offline mutation queue/);
  assert.match(connectivity, /server action succeeds/);
  assert.match(connectivity, /server acknowledgement before completion/);
});


test("NCI-074 survey session start is serialized, idempotent, and cannot restart completed work",()=>{
 assert.match(repository,/SELECT disciplinesJson,status FROM SurveyAssignment[\s\S]*FOR UPDATE/);
 assert.match(repository,/SELECT id,status FROM SurveySession[\s\S]*LIMIT 1 FOR UPDATE/);
 assert.match(repository,/existing\[0\]\?\.status === "IN_PROGRESS"\) return existing\[0\]\.id/);
 assert.match(repository,/Completed survey assignments cannot be restarted/);
});
