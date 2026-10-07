import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { renderProjectPassCctvSvg } from "../../lib/contractor-os/project-pass-svg-renderer";
import type { ProjectPassPremiumOutputManifest } from "../../lib/contractor-os/project-pass-premium-output";

const routePath = path.resolve(
  process.cwd(),
  "app/api/project-pass/premium-output/route.ts"
);
const manifestPath = path.resolve(
  process.cwd(),
  "lib/contractor-os/project-pass-premium-output.ts"
);
const rendererPath = path.resolve(
  process.cwd(),
  "lib/contractor-os/project-pass-svg-renderer.ts"
);
const builderPath = path.resolve(process.cwd(), "../js/cctv-network-diagram-builder.js");

const routeSource = fs.readFileSync(routePath, "utf8");
const manifestSource = fs.readFileSync(manifestPath, "utf8");
const rendererSource = fs.readFileSync(rendererPath, "utf8");
const builderSource = fs.readFileSync(builderPath, "utf8");

function sampleManifest(): ProjectPassPremiumOutputManifest {
  return {
    schemaVersion: 1,
    product: "CCTV_DIAGRAM_EXPORT",
    project: {
      id: "project-a",
      organizationId: "org-a",
      name: `HQ <script>alert("x")</script> & West`,
      projectCode: `CCTV-001\" onclick=\"alert(1)`,
      status: "ACTIVE",
      primarySite: {
        id: "site-a",
        name: "Main & Annex",
        code: "HQ",
        addressLine1: "1 <Main> Street",
        city: "New York",
        stateRegion: "NY",
        postalCode: "10001",
      },
    },
    devices: [
      {
        id: "camera-a",
        name: `Front <Camera> & \"Door\"`,
        type: "CAMERA",
        brand: "Axis & Co",
        model: "P3265 <LE>",
        hostname: "cam-01",
        ipAddress: "10.0.0.10",
        status: "ACTIVE",
      },
      {
        id: "switch-a",
        name: "PoE Switch",
        type: "NETWORK_SWITCH",
        brand: "Cisco",
        model: "CBS350",
        hostname: "sw-01",
        ipAddress: "10.0.0.2",
        status: "ACTIVE",
      },
    ],
    generatedAt: "2026-10-07T12:00:00.000Z",
  };
}

test("NCI-016 premium output requires server entitlement before project-bound SVG delivery", () => {
  const accessIndex = routeSource.indexOf("requireServerVerifiedProjectPassAccess(");
  const manifestIndex = routeSource.indexOf("buildProjectPassPremiumOutputManifest({");
  const renderIndex = routeSource.indexOf("renderProjectPassCctvSvg(manifest)");

  assert.ok(accessIndex >= 0, "premium route must enforce Project Pass entitlement");
  assert.ok(manifestIndex > accessIndex, "manifest must be built only after entitlement succeeds");
  assert.ok(renderIndex > manifestIndex, "SVG must render only from the authorized server manifest");
  assert.match(routeSource, /"Content-Type":\s*"image\/svg\+xml; charset=utf-8"/);
  assert.match(routeSource, /"Content-Disposition":\s*`attachment;/);
  assert.match(routeSource, /"Cache-Control":\s*"private, no-store"/);
  assert.match(routeSource, /"X-Content-Type-Options":\s*"nosniff"/);
});

test("NCI-016 premium output ignores browser-supplied artifact payload", () => {
  assert.doesNotMatch(routeSource, /input\.(diagram|payload|svg|png|pdf|artifact)/i);
  assert.match(
    manifestSource,
    /id:\s*input\.projectInstallationId[\s\S]*organizationId:\s*input\.organizationId/
  );
  assert.match(manifestSource, /prisma\.projectInstallation\.findFirst/);
});

test("NCI-016 server renderer escapes project data and accepts canonical manifest only", () => {
  assert.match(rendererSource, /function escapeXml/);
  assert.match(rendererSource, /ProjectPassPremiumOutputManifest/);
  assert.match(rendererSource, /manifest\.product !== "CCTV_DIAGRAM_EXPORT"/);
  assert.doesNotMatch(rendererSource, /dangerouslySetInnerHTML|eval\(|new Function\(/);

  const svg = renderProjectPassCctvSvg(sampleManifest());
  assert.match(svg, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(svg, /Cameras \(1\)/);
  assert.match(svg, /Network &amp; Recording Infrastructure \(1\)/);
  assert.match(svg, /HQ &lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; West/);
  assert.match(svg, /Front &lt;Camera&gt; &amp; &quot;Door&quot;/);
  assert.doesNotMatch(svg, /<script>|onclick=/);
});

test("NCI-016 public CCTV builder has no browser premium unlock authority", () => {
  assert.doesNotMatch(builderSource, /sessionStorage/);
  assert.doesNotMatch(builderSource, /setPremiumUnlocked/);
  assert.doesNotMatch(builderSource, /unlockStorageKey/);
  assert.doesNotMatch(builderSource, /trustReturnQueryUnlock/);
  assert.doesNotMatch(builderSource, /successValues/);
});
