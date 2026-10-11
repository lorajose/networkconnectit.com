import assert from "node:assert/strict";
import test from "node:test";

import { issueAccountToken, verifyAccountToken } from "../../lib/security/account-token";

test("NCI-026 password reset tokens are purpose-bound and expire", () => {
  const now = new Date("2026-10-11T00:00:00Z");
  const token = issueAccountToken({
    purpose: "PASSWORD_RESET",
    userId: "user-1",
    authVersion: 7,
    now
  });
  const payload = verifyAccountToken(token, "PASSWORD_RESET", new Date("2026-10-11T00:14:59Z"));
  assert.equal(payload.userId, "user-1");
  assert.equal(payload.authVersion, 7);
  assert.throws(() => verifyAccountToken(token, "EMAIL_VERIFY", now), /Invalid or expired/);
  assert.throws(() => verifyAccountToken(token, "PASSWORD_RESET", new Date("2026-10-11T00:15:00Z")), /Invalid or expired/);
});

test("NCI-026 account tokens reject tampering", () => {
  const token = issueAccountToken({ purpose: "EMAIL_VERIFY", userId: "user-2", authVersion: 2, email: "USER@EXAMPLE.COM" });
  const [payload, signature] = token.split(".");
  assert.throws(() => verifyAccountToken(`${payload}x.${signature}`, "EMAIL_VERIFY"), /Invalid or expired/);
  const verified = verifyAccountToken(token, "EMAIL_VERIFY");
  assert.equal(verified.email, "user@example.com");
});
