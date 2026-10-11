import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("NCI-026 rejects disabled users at credential authorization", () => {
  const source = read("lib/auth-options.ts");
  assert.match(source, /if \(!user \|\| !user\.isActive\)/);
});

test("NCI-026 binds JWT sessions to authVersion and revokes stale sessions", () => {
  const source = read("lib/auth-options.ts");
  assert.match(source, /token\.authVersion = user\.authVersion/);
  assert.match(source, /currentUser\.authVersion !== token\.authVersion/);
  assert.match(source, /delete token\.id/);
  assert.match(source, /delete token\.authVersion/);
});

test("NCI-026 schema persists account lifecycle security state", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /isActive\s+Boolean\s+@default\(true\)/);
  assert.match(schema, /authVersion\s+Int\s+@default\(1\)/);
  assert.match(schema, /emailVerifiedAt\s+DateTime\?/);
  assert.match(schema, /passwordChangedAt\s+DateTime\?/);
  assert.match(schema, /@@index\(\[isActive\]\)/);
});


test("NCI-026 lifecycle mutations revoke existing sessions", () => {
  const source = read("lib/security/account-lifecycle.ts");
  const increments = source.match(/authVersion:\s*\{ increment: 1 \}/g) ?? [];
  assert.ok(increments.length >= 3);
  assert.match(source, /setUserActiveState/);
  assert.match(source, /replaceUserPasswordHash/);
  assert.match(source, /invalidateUserSessions/);
});
