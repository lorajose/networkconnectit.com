import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const gatePath = resolve(process.cwd(), "scripts/production-release-gate.mjs");
const source = readFileSync(gatePath, "utf8");

test("production gate script is syntactically valid JavaScript", () => {
  const result = spawnSync(process.execPath, ["--check", gatePath], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("production gate supports the root command domain and legacy path deployment", () => {
  assert.match(source, /legacyBasePath = "\/tools\/command-center"/);
  assert.ok(source.includes('const rootDomain = "command.networkconnectit.com";'));
  assert.match(source, /NEXT_PUBLIC_APP_BASE_PATH must be empty when NEXTAUTH_URL uses/);
  assert.match(source, /NEXTAUTH_URL path must end with/);
});

test("production gate fails closed on bootstrap and recovery hazards", () => {
  assert.match(source, /NCI_ENABLE_FIRST_ADMIN_BOOTSTRAP/);
  assert.match(source, /ENABLE_FIRST_ADMIN_BOOTSTRAP must be disabled when present/);
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


const startupSource = readFileSync(
  resolve(process.cwd(), "scripts/start-godaddy.mjs"),
  "utf8"
);

test("GoDaddy production startup runs the release gate before migrations", () => {
  const gateIndex = startupSource.indexOf("Running Production Release Gate 1 runtime checks before migrations");
  const migrateIndex = startupSource.indexOf("Applying pending Prisma migrations");
  assert.ok(gateIndex >= 0, "production startup must invoke the release gate");
  assert.ok(migrateIndex >= 0, "production startup must invoke prisma migrate deploy");
  assert.ok(gateIndex < migrateIndex, "release gate must run before migrations");
  assert.match(startupSource, /if \(gateResult\.status !== 0\)/);
});


test("NCI-074 guarded recovery runs before migrate deploy and fails closed", () => {
  const startup = readFileSync(resolve(process.cwd(), "scripts/start-godaddy.mjs"), "utf8");
  const recoveryIndex = startup.indexOf("NCI_RECOVER_NCI074=1");
  const migrateIndex = startup.indexOf("Applying pending Prisma migrations");
  assert.ok(recoveryIndex >= 0, "NCI-074 recovery must be wired into startup");
  assert.ok(migrateIndex >= 0, "migrate deploy must remain in startup");
  assert.ok(recoveryIndex < migrateIndex, "NCI-074 recovery must execute before migrate deploy");
  assert.match(startup, /NCI-074 recovery failed with status/);
});

test("NCI-074 recovery verifies zero-row partial tables before dropping and uses prisma resolve", () => {
  const recovery = readFileSync(resolve(process.cwd(), "scripts/recover-nci074-godaddy.mjs"), "utf8");
  assert.match(recovery, /partial table .* contains .* row\(s\); refusing to drop data/);
  assert.match(recovery, /DROP TABLE/);
  assert.match(recovery, /"migrate", "resolve", "--rolled-back", migrationName/);
  assert.match(recovery, /unexpected partial table state .* refusing automatic cleanup/);
  assert.match(recovery, /migrationTablesInOrder\.slice\(0, 6\)/);
  assert.match(recovery, /migrationTablesInOrder\.slice\(0, 9\)/);
});


test("NCI-074 evidence storage key unique index stays within MariaDB utf8mb4 key limit", () => {
  const migration = readFileSync(
    resolve(process.cwd(), "prisma/migrations/20260922033500_nci074_survey_floor_plan_draft/migration.sql"),
    "utf8"
  );
  assert.match(migration, /storageKey VARCHAR\(512\) NOT NULL/);
  assert.doesNotMatch(migration, /storageKey VARCHAR\(1024\) NOT NULL/);
  assert.match(migration, /UNIQUE INDEX ProjectWorkOrderEvidence_storage_key \(storageKey\)/);
});
