import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("NCI-037 structured audit logging is tenant-aware and secret-safe", () => {
  const source = read("lib/operations/audit-log.ts");
  assert.match(source, /type: "audit"/);
  assert.match(source, /actorUserId/);
  assert.match(source, /organizationId/);
  assert.match(source, /occurredAt/);
  assert.match(source, /password\|secret\|token\|authorization\|cookie\|hash\|document\|content/i);
});

test("NCI-037 runtime errors exclude provider messages and stacks", () => {
  const source = read("lib/operations/runtime-error.ts");
  assert.match(source, /type: "runtime_error"/);
  assert.match(source, /errorName/);
  assert.doesNotMatch(source, /error\.message/);
  assert.doesNotMatch(source, /error\.stack/);
});

test("NCI-037 health endpoint is non-secret and non-cacheable", () => {
  const source = read("app/api/health/route.ts");
  assert.match(source, /Cache-Control/);
  assert.match(source, /no-store/);
  assert.match(source, /timestamp: new Date\(\)\.toISOString\(\)/);
  assert.doesNotMatch(source, /process\.env|DATABASE_URL|NEXTAUTH_SECRET|STRIPE_SECRET_KEY/);
});

test("NCI-037 operational evidence is required before Done", () => {
  const policy = read("docs/nci037-audit-backup-observability.md");
  const checklist = read("docs/nci037-release-checklist.md");
  const restore = read("docs/nci037-restore-test-evidence-template.md");
  assert.match(policy, /automated daily backup minimum/i);
  assert.match(policy, /isolated non-production database/i);
  assert.match(policy, /Done requires evidence/i);
  assert.match(checklist, /must remain QA until the environment evidence above is complete/i);
  assert.match(restore, /Status: NOT EXECUTED/i);
  assert.match(restore, /does not authorize a production backup, restore, migration or deployment/i);
});
