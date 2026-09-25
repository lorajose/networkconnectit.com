import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration=readFileSync(resolve(process.cwd(),"prisma/migrations/20260925143000_nci014_cable_run_execution/migration.sql"),"utf8");
const source=readFileSync(resolve(process.cwd(),"lib/contractor-os/cable-run-execution.ts"),"utf8");

test("NCI-014 extends work-order execution instead of rebuilding Device inventory",()=>{
 assert.match(migration,/ALTER TABLE ProjectWorkOrderItem/);
 assert.doesNotMatch(migration,/CREATE TABLE Device/);
 assert.match(migration,/runIdentifier/);
 assert.match(migration,/fromLocation/);
 assert.match(migration,/toLocation/);
 assert.match(migration,/measuredLength/);
});

test("NCI-014 records independent low-voltage test outcomes and evidence",()=>{
 assert.match(migration,/wiremapStatus/);
 assert.match(migration,/gigabitLinkStatus/);
 assert.match(source,/overallTestStatus/);
 assert.match(source,/evidenceSaved/);
 assert.match(source,/New runs require measured length and tester evidence before PASS/);
});

test("NCI-014 preserves the field stage history and rejection punch workflow",()=>{
 for(const stage of ["PULLED","TERMINATED","LABELED","WIREMAP","GIGABIT_LINK","TESTED","EVIDENCE_SAVED","READY"]) assert.match(source,new RegExp(stage));
 assert.match(source,/ProjectWorkOrderItemEvent/);
 assert.match(source,/ProjectPunchListItem/);
 assert.match(source,/REJECTED/);
 assert.match(source,/ACCEPTED/);
});

test("NCI-014 provides reusable floor closeout checks",()=>{
 assert.match(migration,/ProjectWorkOrderFloorCloseout/);
 for(const field of ["cableSupportPassed","racewayConduitPassed","firestopPassed","labelReconciliationPassed","cleanupPassed","workAreaPhotosSaved"]) assert.match(migration,new RegExp(field));
});
