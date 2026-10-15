import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const schema = readFileSync(
  join(process.cwd(), "prisma", "schema.prisma"),
  "utf8"
);
const migration = readFileSync(
  join(
    process.cwd(),
    "prisma",
    "migrations",
    "20261013211500_nci087_atomic_publish",
    "migration.sql"
  ),
  "utf8"
);
const publishService = readFileSync(
  join(process.cwd(), "lib", "menuboard", "publish.ts"),
  "utf8"
);
const playerContentRoute = readFileSync(
  join(
    process.cwd(),
    "app",
    "api",
    "menuboard",
    "player",
    "content",
    "route.ts"
  ),
  "utf8"
);

test("screen assignment points at an immutable active publish", () => {
  const assignment =
    schema.match(/model MenuScreenAssignment \{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.match(assignment, /activePublishId\s+String\?/);
  assert.match(assignment, /activePublish\s+MenuPublish\?/);
  assert.match(migration, /ADD COLUMN `activePublishId`/);
  assert.match(migration, /REFERENCES `MenuPublish`/);
});

test("publish is versioned, hashed and switches assigned screens atomically", () => {
  assert.match(publishService, /payloadHash/);
  assert.match(publishService, /version:\s*\(latest\?\.version \?\? 0\) \+ 1/);
  assert.match(publishService, /prisma\.\$transaction/);
  assert.match(publishService, /activePublishId:\s*publish\.id/);
});

test("player content endpoint requires bearer auth and serves active publish only", () => {
  assert.match(playerContentRoute, /Bearer\\s\+/);
  assert.match(playerContentRoute, /activePublish/);
  assert.doesNotMatch(playerContentRoute, /sections.*menu.*draft/i);
});
