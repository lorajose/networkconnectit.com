import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const exportPage = () =>
  readFileSync(resolve(process.cwd(), "app/(exports)/design-studio/[projectId]/export/page.tsx"), "utf8");

const backgroundRoute = () =>
  readFileSync(resolve(process.cwd(), "app/api/design-studio/background/route.ts"), "utf8");

test("NCI-073 internal Design Studio export is restricted to platform admins", () => {
  const source = exportPage();
  assert.match(
    source,
    /\(user\.role === "SUPER_ADMIN" \|\| user\.role === "INTERNAL_ADMIN"\) && searchParams\?\.profile === "internal"/,
  );
  assert.match(source, /clientSafe: !requestedInternal/);
  assert.match(source, /includePricing: requestedInternal/);
});

test("NCI-073 client tenant cannot be selected from export query parameters", () => {
  const source = exportPage();
  assert.match(source, /const organizationId = user\.organizationId \?\? searchParams\?\.organizationId \?\? ""/);
  assert.match(source, /designExportPolicy\(actor, organizationId\)/);
  assert.match(source, /getDesignProject\(actor, params\.projectId, exportPolicy\.organizationId\)/);
});

test("NCI-073 premium export entitlement is checked server-side before project export", () => {
  const source = exportPage();
  const entitlement = source.indexOf('requireSubscriptionFeatureForActor(actor, "PREMIUM_PROJECT_OUTPUTS", organizationId)');
  const projectRead = source.indexOf("getDesignProject(actor, params.projectId");
  assert.ok(entitlement >= 0);
  assert.ok(projectRead > entitlement);
});

test("NCI-073 floor-plan assets are served through authenticated private no-store route", () => {
  const source = backgroundRoute();
  assert.match(source, /getCurrentUser\(\)/);
  assert.match(source, /hasRequiredRole\(user\.role, routeAccess\.designStudio\)/);
  assert.match(source, /user\.role === "CLIENT_ADMIN" \? user\.organizationId \?\? "" : requestedOrganizationId/);
  assert.match(source, /getDesignFloorBackgroundAsset\(/);
  assert.match(source, /readPrivateDesignAsset\(asset\.storageKey\)/);
  assert.match(source, /"Cache-Control": "private, no-store, max-age=0"/);
  assert.match(source, /"X-Content-Type-Options": "nosniff"/);
});
