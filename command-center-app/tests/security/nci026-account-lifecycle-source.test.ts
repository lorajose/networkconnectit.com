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

test("NCI-026 reset and verification never trust browser-owned account identity", () => {
  const source = read("lib/security/account-recovery.ts");
  assert.match(source, /issuePasswordResetTokenForDelivery/);
  assert.match(source, /return null/);
  assert.match(source, /user\.authVersion !== payload\.authVersion/);
  assert.match(source, /user\.email\.toLowerCase\(\) !== payload\.email/);
  assert.match(source, /replaceUserPasswordHash/);
});

test("NCI-026 credentials login applies bounded backoff without retaining plaintext email keys", () => {
  const auth = read("lib/auth-options.ts");
  const abuse = read("lib/security/login-abuse-control.ts");
  assert.match(auth, /isLoginTemporarilyBlocked\(email\)/);
  assert.match(auth, /recordLoginFailure\(email\)/);
  assert.match(auth, /clearLoginFailures\(email\)/);
  assert.match(abuse, /createHash\("sha256"\)/);
  assert.match(abuse, /MAX_TRACKED_KEYS = 10_000/);
  assert.match(abuse, /MAX_BACKOFF_MS = 60_000/);
});
