import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve(process.cwd(), "scripts/production-release-gate.mjs"), "utf8");

test("production gate pins the current path-based deployment", () => {
  assert.match(source, /expectedBasePath = "\/tools\/command-center"/);
  assert.match(source, /NEXTAUTH_URL path must end with/);
});

test("production gate fails closed on bootstrap and recovery hazards", () => {
  assert.match(source, /NCI_ENABLE_FIRST_ADMIN_BOOTSTRAP/);
  assert.match(source, /ENABLE_FIRST_ADMIN_BOOTSTRAP must be false/);
  assert.match(source, /FIRST_ADMIN_BOOTSTRAP_TOKEN must be empty\/removed/);
  assert.match(source, /NCI_RECOVER_NCI049 recovery flag must be disabled for release/);
  assert.match(source, /NCI_RECOVER_ALERT_SCHEMA recovery flag must be disabled for release/);
});

test("production gate validates private storage configuration", () => {
  assert.match(source, /BID_STORAGE_DRIVER/);
  assert.match(source, /BID_SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /BID_PRIVATE_STORAGE_ROOT/);
});
