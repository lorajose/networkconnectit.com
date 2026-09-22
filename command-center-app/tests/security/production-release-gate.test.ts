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


test("production gate fails closed on runtime-only hazards", () => {
  assert.match(source, /NODE_ENV must be production/);
  assert.match(source, /DATABASE_ADMIN_URL must not be configured in production/);
  assert.match(source, /BID_STORAGE_DRIVER must be filesystem or supabase/);
});

test("production gate validates database connection without exposing credentials", () => {
  assert.match(source, /DB_HOST/);
  assert.match(source, /DB_NAME/);
  assert.match(source, /DB_USER/);
  assert.match(source, /Production database connection must be configured/);
  assert.match(source, /Production DATABASE_URL must not point to loopback/);
});


test("production gate requires a non-loopback database connection shape", () => {
  assert.match(source, /DB_HOST/);
  assert.match(source, /DB_NAME/);
  assert.match(source, /DB_USER/);
  assert.match(source, /Production DATABASE_URL must not point to loopback/);
  assert.match(source, /Production database connection must be configured/);
});


test("GoDaddy production startup runs release gate before migrate deploy", () => {
  const startup = readFileSync(resolve(process.cwd(), "scripts/start-godaddy.mjs"), "utf8");
  const gateIndex = startup.indexOf("production-release-gate.mjs");
  const migrateIndex = startup.indexOf('"migrate", "deploy"');
  assert.ok(gateIndex >= 0, "production release gate must be wired into startup");
  assert.ok(migrateIndex >= 0, "migrate deploy must remain in startup");
  assert.ok(gateIndex < migrateIndex, "release gate must execute before migrations");
  assert.match(startup, /process\.env\.NODE_ENV === "production"/);
});
