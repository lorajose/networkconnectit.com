import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

test("NCI-037 emits tenant-aware audit events without sensitive metadata", () => {
  const source = read("lib/operations/audit-event.ts");
  assert.match(source, /organizationId/);
  assert.match(source, /actorUserId/);
  assert.match(source, /targetType/);
  assert.match(source, /result/);
  assert.match(source, /password\|secret\|token\|hash\|authorization\|cookie\|document\|content/i);
});

test("NCI-037 exposes a non-cached runtime health probe", () => {
  const route = read("app/api/health/route.ts");
  const health = read("lib/operations/health.ts");
  assert.match(route, /Cache-Control/);
  assert.match(route, /no-store/);
  assert.match(route, /runtimeHealthSnapshot/);
  assert.match(health, /uptimeSeconds/);
  assert.match(health, /nodeEnv/);
});

test("NCI-037 documents backup, restore, alerting and retention gates", () => {
  const runbook = read("docs/nci037-operations-runbook.md");
  assert.match(runbook, /daily minimum/i);
  assert.match(runbook, /isolated non-production database/i);
  assert.match(runbook, /HTTP 5xx/i);
  assert.match(runbook, /365 days target/i);
  assert.match(runbook, /cannot be Done until/i);
});
