import assert from "node:assert/strict";import { readFileSync } from "node:fs";import test from "node:test";import { resolve } from "node:path";
const source=readFileSync(resolve(process.cwd(),"lib/contractor-os/project-approval-work-order.ts"),"utf8");
test("customer decisions are recorded by an internal actor without impersonating customer",()=>{assert.ok(source.includes("'INTERNAL_USER'"));assert.ok(source.includes("customerName:input.customerName.trim()"));assert.ok(source.includes("decisionRecordedByUserId:input.userId"));assert.ok(!source.includes("${input.customerName.trim()},'CUSTOMER'"));});

test("closeout package generation reuses canonical evidence and records an activity event",()=>{
  assert.ok(source.includes("ProjectWorkOrderEvidence"));
  assert.ok(source.includes("ProjectFinalAcceptance"));
  assert.ok(source.includes("ProjectCloseoutPackage"));
  assert.ok(source.includes("'CLOSEOUT_PACKAGE_GENERATED'"));
  assert.ok(source.includes("manifestHash"));
});
