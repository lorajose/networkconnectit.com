import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const routePath = path.resolve(
  process.cwd(),
  "app/api/project-pass/premium-output/route.ts"
);
const manifestPath = path.resolve(
  process.cwd(),
  "lib/contractor-os/project-pass-premium-output.ts"
);
const builderPath = path.resolve(process.cwd(), "../js/cctv-network-diagram-builder.js");

const routeSource = fs.readFileSync(routePath, "utf8");
const manifestSource = fs.readFileSync(manifestPath, "utf8");
const builderSource = fs.readFileSync(builderPath, "utf8");

test("NCI-016 premium output requires server entitlement before project manifest delivery", () => {
  const accessIndex = routeSource.indexOf("requireServerVerifiedProjectPassAccess(");
  const manifestIndex = routeSource.indexOf("buildProjectPassPremiumOutputManifest({");

  assert.ok(accessIndex >= 0, "premium route must enforce Project Pass entitlement");
  assert.ok(manifestIndex > accessIndex, "manifest must be built only after entitlement succeeds");
  assert.match(routeSource, /delivery:\s*"PROJECT_BOUND_MANIFEST"/);
  assert.match(routeSource, /"Cache-Control":\s*"private, no-store"/);
});

test("NCI-016 premium output ignores browser-supplied artifact payload", () => {
  assert.doesNotMatch(routeSource, /input\.(diagram|payload|svg|png|pdf|artifact)/i);
  assert.match(
    manifestSource,
    /id:\s*input\.projectInstallationId[\s\S]*organizationId:\s*input\.organizationId/
  );
  assert.match(manifestSource, /prisma\.projectInstallation\.findFirst/);
});

test("NCI-016 public CCTV builder has no browser premium unlock authority", () => {
  assert.doesNotMatch(builderSource, /sessionStorage/);
  assert.doesNotMatch(builderSource, /setPremiumUnlocked/);
  assert.doesNotMatch(builderSource, /unlockStorageKey/);
  assert.doesNotMatch(builderSource, /trustReturnQueryUnlock/);
  assert.doesNotMatch(builderSource, /successValues/);
});
