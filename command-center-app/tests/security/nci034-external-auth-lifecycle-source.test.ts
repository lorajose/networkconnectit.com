import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const requestAction = readFileSync("app/(auth)/forgot-password/actions.ts", "utf8");
const resetAction = readFileSync("app/(auth)/reset-password/actions.ts", "utf8");
const delivery = readFileSync("lib/security/account-email-delivery.ts", "utf8");
const recovery = readFileSync("lib/security/account-recovery.ts", "utf8");
const authOptions = readFileSync("lib/auth-options.ts", "utf8");
const userAdmin = readFileSync("lib/security/user-administration.ts", "utf8");
const plan = readFileSync("docs/nci034-external-auth-lifecycle-plan.md", "utf8");

test("NCI-034 reset request does not disclose account existence or return a token", () => {
  assert.match(requestAction, /issuePasswordResetTokenForDelivery/);
  assert.match(requestAction, /forgot-password\?sent=1/);
  assert.doesNotMatch(requestAction, /redirect\([^\n]*token/);
});

test("NCI-034 password reset uses the NCI-026 single-use authVersion flow", () => {
  assert.match(resetAction, /completePasswordReset\(token, password\)/);
  assert.match(recovery, /user\.authVersion !== payload\.authVersion/);
  assert.match(recovery, /replaceUserPasswordHash/);
});

test("NCI-034 delivery keeps credentials server-only and uses HTTPS in production", () => {
  assert.match(delivery, /process\.env\.RESEND_API_KEY/);
  assert.match(delivery, /process\.env\.AUTH_EMAIL_FROM/);
  assert.match(delivery, /process\.env\.AUTH_PUBLIC_BASE_URL/);
  assert.match(delivery, /baseUrl\.protocol !== "https:"/);
  assert.doesNotMatch(delivery, /NEXT_PUBLIC_RESEND/);
});

test("NCI-034 consolidates existing abuse, role and session controls", () => {
  assert.match(authOptions, /isLoginTemporarilyBlocked/);
  assert.match(userAdmin, /authVersion: \{ increment: 1 \}/);
  assert.match(plan, /MFA.*post-V1/i);
});
