import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/(protected)/users/page.tsx", "utf8");
const actions = readFileSync("app/(protected)/users/actions.ts", "utf8");

test("NCI-028 users page uses tenant administration service instead of direct Prisma access", () => {
  assert.match(page, /listTenantUsers\(actor\)/);
  assert.doesNotMatch(page, /prisma\./);
  assert.match(page, /actor\.role !== "CLIENT_ADMIN"/);
});

test("NCI-028 server actions derive the actor from the authenticated session", () => {
  assert.match(actions, /requireRoles\(routeAccess\.users\)/);
  assert.match(actions, /organizationId: user\.organizationId \?\? null/);
  assert.doesNotMatch(actions, /formData\.get\("organizationId"\)/);
});

test("NCI-028 browser role choices exclude platform roles", () => {
  assert.match(page, /value="CLIENT_ADMIN"/);
  assert.match(page, /value="VIEWER"/);
  assert.doesNotMatch(page, /value="SUPER_ADMIN"/);
  assert.doesNotMatch(page, /value="INTERNAL_ADMIN"/);
});
