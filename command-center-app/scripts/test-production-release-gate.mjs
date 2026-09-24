import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const base = {
  ...process.env,
  NODE_ENV: "production",
  NEXTAUTH_SECRET: "ci-release-gate-secret-value-1234567890",
  NEXTAUTH_URL: "https://command.networkconnectit.com/api/auth",
  NEXT_PUBLIC_APP_BASE_PATH: "",
  DATABASE_URL: "mysql://ci:ci@db.example.internal:3306/command_center",
  BID_STORAGE_DRIVER: "filesystem",
  BID_PRIVATE_STORAGE_ROOT: "/tmp/nci-private",
  ENABLE_FIRST_ADMIN_BOOTSTRAP: "false",
  FIRST_ADMIN_BOOTSTRAP_TOKEN: "",
  DATABASE_ADMIN_URL: ""
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

const loopbackDb = gate({ DATABASE_URL: "mysql://ci:ci@127.0.0.1:3306/command_center" });
assert.notEqual(loopbackDb.status, 0);
assert.match(loopbackDb.stderr, /must not point to loopback/);

console.log("PASS release gate: canonical auth host/root path, strong secret and non-loopback production DB.");
