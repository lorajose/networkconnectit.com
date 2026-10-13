import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  canAccessOrganization,
  getScopedRecordWhere,
  resolveWritableOrganizationId,
  type TenantUser
} from "../../lib/management/tenant-policy";

const clientUser: TenantUser = {
  id: "user-a",
  role: "CLIENT_ADMIN",
  organizationId: "org-a"
};

const read = (...parts: string[]) =>
  readFileSync(join(process.cwd(), ...parts), "utf8");

const menusSource = read("lib", "menuboard", "menus.ts");
const screensSource = read("lib", "menuboard", "screens.ts");
const publishSource = read("lib", "menuboard", "publish.ts");
const playerRoute = read(
  "app",
  "api",
  "menuboard",
  "player",
  "content",
  "route.ts"
);

test("tenant policy rejects cross-organization writes for client admins", () => {
  assert.deepEqual(getScopedRecordWhere(clientUser), {
    organizationId: "org-a"
  });
  assert.equal(canAccessOrganization(clientUser, "org-a"), true);
  assert.equal(canAccessOrganization(clientUser, "org-b"), false);
  assert.equal(resolveWritableOrganizationId(clientUser, "org-b"), "org-a");
});

test("MenuBoard service mutations retain tenant and store scope guards", () => {
  assert.match(menusSource, /\.\.\.getScopedRecordWhere\(user\)/);
  assert.match(screensSource, /\.\.\.getScopedRecordWhere\(user\)/);
  assert.match(publishSource, /\.\.\.getScopedRecordWhere\(user\)/);

  assert.match(
    menusSource,
    /organizationId:\s*menu\.organizationId[\s\S]*siteId:\s*menu\.siteId/
  );
  assert.match(
    menusSource,
    /screens\.length !== uniqueScreenIds\.length/
  );
});

test("public player content is token-derived and accepts no tenant or screen selector", () => {
  assert.match(playerRoute, /getMenuBoardPlayerContent\(token\)/);
  assert.doesNotMatch(playerRoute, /searchParams/);
  assert.doesNotMatch(playerRoute, /organizationId/);
  assert.doesNotMatch(playerRoute, /siteId/);
  assert.doesNotMatch(playerRoute, /screenId/);
});

test("expired pairing codes and revoked player tokens fail closed", () => {
  assert.match(
    screensSource,
    /isPairingCodeExpired\(candidate\.expiresAt, now\)/
  );
  assert.match(
    screensSource,
    /playerTokenRevokedAt:\s*null/
  );
  assert.match(
    screensSource,
    /playerTokenHash:\s*null[\s\S]*playerTokenRevokedAt:\s*now/
  );
});
