import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const schema = readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf8");
const migration = readFileSync(
  join(process.cwd(), "prisma", "migrations", "20261013202500_nci083_menuboard_foundation", "migration.sql"),
  "utf8",
);

const modelBlock = (name: string) => {
  const match = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`));
  assert.ok(match, `Expected Prisma model ${name}`);
  return match[1];
};

test("MenuBoard tenant-owned models persist organization scope", () => {
  for (const name of [
    "MenuBoardScreen",
    "Menu",
    "MenuSection",
    "MenuItem",
    "MenuPublish",
    "MenuScreenAssignment",
    "MenuPlayerHeartbeat",
  ]) {
    const block = modelBlock(name);
    assert.match(block, /organizationId\s+String\s+/);
    assert.match(block, /organization\s+Organization\s+@relation/);
  }
});

test("screen player credential is hashed, unique and revocable", () => {
  const block = modelBlock("MenuBoardScreen");
  assert.match(block, /playerTokenHash\s+String\?\s+@unique\s+@db\.VarChar\(64\)/);
  assert.match(block, /playerTokenRevokedAt\s+DateTime\?/);
  assert.doesNotMatch(block, /playerToken\s+/);
});

test("published content is immutable-version ready and screen assignment is singular", () => {
  const publish = modelBlock("MenuPublish");
  const assignment = modelBlock("MenuScreenAssignment");
  assert.match(publish, /version\s+Int/);
  assert.match(publish, /payload\s+Json/);
  assert.match(publish, /payloadHash\s+String\s+@db\.VarChar\(64\)/);
  assert.match(publish, /@@unique\(\[menuId, version\]\)/);
  assert.match(assignment, /screenId\s+String\s+@unique/);
});

test("money is integer cents and not floating point", () => {
  const item = modelBlock("MenuItem");
  assert.match(item, /priceCents\s+Int/);
  assert.doesNotMatch(item, /price\s+Float/);
  assert.doesNotMatch(item, /price\s+Decimal/);
});

test("migration remains source-controlled and creates the full MenuBoard foundation", () => {
  for (const table of [
    "MenuBoardScreen",
    "Menu",
    "MenuSection",
    "MenuItem",
    "MenuPublish",
    "MenuScreenAssignment",
    "MenuPlayerHeartbeat",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE \\\`${table}\\\``));
  }
  assert.match(migration, /MenuBoardScreen_playerTokenHash_key/);
  assert.match(migration, /MenuPublish_menuId_version_key/);
  assert.match(migration, /ON DELETE CASCADE/);
});
