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
    "20261013204500_nci086_deli_template",
    "migration.sql"
  ),
  "utf8"
);
const template = readFileSync(
  join(
    process.cwd(),
    "components",
    "menuboard",
    "deli-menu-template.tsx"
  ),
  "utf8"
);

test("deli template persists customer-facing presentation metadata", () => {
  const menu = schema.match(/model Menu \{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(menu, /displayName\s+String\?/);
  assert.match(menu, /logoUrl\s+String\?/);
  assert.match(menu, /promotionTitle\s+String\?/);
  assert.match(menu, /promotionText\s+String\?/);

  for (const field of [
    "displayName",
    "logoUrl",
    "promotionTitle",
    "promotionText"
  ]) {
    assert.match(migration, new RegExp(`ADD COLUMN \\\`${field}\\\``));
  }
});

test("deli template is explicitly 16:9 and protects common long-text paths", () => {
  assert.match(template, /aspect-video/);
  assert.match(template, /data-menuboard-template="DELI_LANDSCAPE_V1"/);
  assert.match(template, /truncate/);
  assert.match(template, /whitespace-nowrap/);
  assert.match(template, /item\.isAvailable/);
});
