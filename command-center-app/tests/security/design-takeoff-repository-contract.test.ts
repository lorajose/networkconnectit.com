import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const source = fs.readFileSync(path.join(process.cwd(), "lib/contractor-os/design-takeoff-repository.ts"), "utf8");

test("design takeoff persistence is tenant-scoped and transactional", () => {
  assert.match(source, /requireCommercialWriteAccess/);
  assert.match(source, /TakeoffWorkspace/);
  assert.match(source, /organizationId=\$\{organizationId\}/);
  assert.match(source, /prisma\.\$transaction/);
});

test("design handoff preserves manual rows and replaces only matching AI proposal rows", () => {
  assert.match(source, /source='AI_SUGGESTED'/);
  assert.match(source, /notes LIKE/);
  assert.doesNotMatch(source, /DELETE FROM TakeoffItem\s+WHERE takeoffWorkspaceId=\$\{input\.workspaceId\}\s+AND organizationId=\$\{organizationId\}\s*`/);
});

test("review attribution is persisted with authoritative takeoff and BOM rows", () => {
  assert.match(source, /approved by/);
  assert.match(source, /INSERT INTO TakeoffItem/);
  assert.match(source, /INSERT INTO TakeoffBomItem/);
  assert.match(source, /approvedAt/);
});
