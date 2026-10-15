import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("NCI-028 derives client tenant scope from the authenticated actor", () => {
  const source = read("lib/security/user-administration.ts");
  assert.match(source, /actor\.role !== "CLIENT_ADMIN" \|\| !actor\.organizationId/);
  assert.match(source, /where: \{ organizationId \}/);
  assert.match(source, /where: \{ id: userId, organizationId \}/);
});

test("NCI-028 blocks client privilege escalation to platform roles", () => {
  const source = read("lib/security/user-administration.ts");
  assert.match(source, /CLIENT_ASSIGNABLE_ROLES[^\n]*\["CLIENT_ADMIN", "VIEWER"\]/);
  assert.match(source, /Client administrators cannot assign platform roles/);
});

test("NCI-028 protects the last active client administrator", () => {
  const source = read("lib/security/user-administration.ts");
  assert.match(source, /activeAdmins <= 1/);
  assert.match(source, /last active client administrator cannot be demoted/);
  assert.match(source, /last active client administrator cannot be disabled/);
});

test("NCI-028 revokes sessions for role and active-state changes", () => {
  const source = read("lib/security/user-administration.ts");
  assert.match(source, /authVersion: \{ increment: 1 \}/);
  assert.match(source, /setUserActiveState\(target\.id, input\.isActive, input\.actor\.id\)/);
});

test("NCI-028 never logs passwords or invitation secrets in account security events", () => {
  const source = read("lib/security/account-security-audit.ts");
  assert.match(source, /exclude email addresses, passwords, hashes and tokens/);
  assert.doesNotMatch(source, /passwordHash:/);
  assert.doesNotMatch(source, /token:/);
});
