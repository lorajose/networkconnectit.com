import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const base = {
  ...process.env,
  NODE_ENV: "production",
  NEXTAUTH_SECRET: "ci-production-auth-key-8f4c2a7d91b6e305",
  NEXTAUTH_URL: "https://command.networkconnectit.com/api/auth",
  NEXT_PUBLIC_APP_BASE_PATH: "",
  DATABASE_URL: "mysql://ci:ci@db.example.internal:3306/command_center?sslaccept=strict",
  BID_STORAGE_DRIVER: "filesystem",
  BID_PRIVATE_STORAGE_ROOT: "/tmp/nci-private",
  ENABLE_FIRST_ADMIN_BOOTSTRAP: "false",
  FIRST_ADMIN_BOOTSTRAP_TOKEN: "",
  DATABASE_ADMIN_URL: "",
  NCI_ALLOW_DEMO_SEED: "false",
  NCI_DATABASE_TLS_MODE: "verify-identity"
};

function gate(overrides = {}) {
  return spawnSync(process.execPath, ["scripts/production-release-gate.mjs"], {
    cwd: process.cwd(),
    env: { ...base, ...overrides },
    encoding: "utf8"
  });
}

const valid = gate();
assert.equal(valid.status, 0, valid.stderr);
assert.match(valid.stdout, /environment checks passed/);

const legacyPath = gate({
  NEXTAUTH_URL: "https://command.networkconnectit.com/tools/command-center/api/auth",
  NEXT_PUBLIC_APP_BASE_PATH: "/tools/command-center"
});
assert.notEqual(legacyPath.status, 0);
assert.match(legacyPath.stderr, /must be empty/);

const wrongHost = gate({ NEXTAUTH_URL: "https://example.com/api/auth" });
assert.notEqual(wrongHost.status, 0);
assert.match(wrongHost.stderr, /production host must be command\.networkconnectit\.com/);

const demoSeed = gate({ NCI_ALLOW_DEMO_SEED: "true" });
assert.notEqual(demoSeed.status, 0);
assert.match(demoSeed.stderr, /DEMO_SEED must be disabled/);

const missingTls = gate({ NCI_DATABASE_TLS_MODE: "" });
assert.notEqual(missingTls.status, 0);
assert.match(missingTls.stderr, /DATABASE_TLS_MODE must explicitly require TLS/);

const declaredVerifiedTlsWithoutUrlTls = gate({
  DATABASE_URL: "mysql://ci:ci@db.example.internal:3306/command_center",
  NCI_DATABASE_TLS_MODE: "verify-identity"
});
assert.notEqual(declaredVerifiedTlsWithoutUrlTls.status, 0);
assert.match(declaredVerifiedTlsWithoutUrlTls.stderr, /sslaccept=strict/);

const loopbackDb = gate({ DATABASE_URL: "mysql://ci:ci@127.0.0.1:3306/command_center" });
assert.notEqual(loopbackDb.status, 0);
assert.match(loopbackDb.stderr, /must not point to loopback/);

const designFilesystem = gate({ DESIGN_STORAGE_DRIVER: "filesystem", DESIGN_PRIVATE_STORAGE_ROOT: "/srv/nci-private", BID_STORAGE_DRIVER: "", BID_PRIVATE_STORAGE_ROOT: "" });
assert.equal(designFilesystem.status, 0, designFilesystem.stderr);

const relativePrivateRoot = gate({ DESIGN_STORAGE_DRIVER: "filesystem", DESIGN_PRIVATE_STORAGE_ROOT: "relative/private", BID_PRIVATE_STORAGE_ROOT: "" });
assert.notEqual(relativePrivateRoot.status, 0);
assert.match(relativePrivateRoot.stderr, /absolute path/);

const incompleteObjectStorage = gate({ DESIGN_STORAGE_DRIVER: "supabase", DESIGN_SUPABASE_URL: "https://storage.invalid", DESIGN_SUPABASE_SERVICE_ROLE_KEY: "", DESIGN_SUPABASE_BUCKET: "private-evidence", BID_SUPABASE_SERVICE_ROLE_KEY: "" });
assert.notEqual(incompleteObjectStorage.status, 0);
assert.match(incompleteObjectStorage.stderr, /requires URL, service-role key and bucket/);

console.log("PASS release gate: auth, database TLS and private storage configuration.");
