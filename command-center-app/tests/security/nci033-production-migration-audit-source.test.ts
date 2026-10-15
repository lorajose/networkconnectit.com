import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = () =>
  readFileSync(resolve(process.cwd(), "scripts/audit-production-migration-history.mjs"), "utf8");

test("NCI-033 production migration audit inspects every local migration", () => {
  const text = source();
  assert.match(text, /readdirSync\(resolve\(process\.cwd\(\), "prisma", "migrations"\)/);
  assert.match(text, /localMigrationNames\(\)/);
  assert.match(text, /database contains migration .* absent from this release/);
  assert.match(text, /has an incomplete active migration record/);
  assert.match(text, /has more than one active applied record/);
  assert.match(text, /checksum differs from the migration\.sql currently in this release/);
  assert.doesNotMatch(text, /watchedMigrations/);
});
