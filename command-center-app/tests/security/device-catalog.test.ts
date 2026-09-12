import assert from "node:assert/strict";
import test from "node:test";

import {
  catalogReadOrganizationId,
  normalizeDeviceCatalogVisibility,
  normalizeDeviceRevisionInput,
  requireCatalogWriteScope,
} from "../../lib/contractor-os/device-catalog";

test("client admins can only read their own tenant catalog plus shared entries", () => {
  const actor = { role: "CLIENT_ADMIN" as const, organizationId: "org-a" };
  assert.equal(catalogReadOrganizationId(actor), "org-a");
  assert.equal(catalogReadOrganizationId(actor, "org-a"), "org-a");
  assert.throws(() => catalogReadOrganizationId(actor, "org-b"), /Cross-tenant catalog read denied/);
});

test("viewers cannot modify catalog records", () => {
  const actor = { role: "VIEWER" as const, organizationId: "org-a" };
  assert.throws(() => requireCatalogWriteScope(actor, "ORGANIZATION_PRIVATE", "org-a"), /VIEWER cannot modify/);
});

test("client admins cannot publish enterprise shared devices", () => {
  const actor = { role: "CLIENT_ADMIN" as const, organizationId: "org-a" };
  assert.throws(() => requireCatalogWriteScope(actor, "ENTERPRISE_SHARED", "org-a"), /Only internal admins/);
});

test("internal admins can publish enterprise shared devices without tenant ownership", () => {
  const actor = { role: "INTERNAL_ADMIN" as const };
  assert.equal(requireCatalogWriteScope(actor, "ENTERPRISE_SHARED"), null);
});

test("client admin private writes are tenant scoped", () => {
  const actor = { role: "CLIENT_ADMIN" as const, organizationId: "org-a" };
  assert.equal(requireCatalogWriteScope(actor, "ORGANIZATION_PRIVATE", "org-a"), "org-a");
  assert.throws(() => requireCatalogWriteScope(actor, "ORGANIZATION_PRIVATE", "org-b"), /Cross-tenant catalog write denied/);
});

test("catalog visibility is normalized and rejects unknown values", () => {
  assert.equal(normalizeDeviceCatalogVisibility(" organization_private "), "ORGANIZATION_PRIVATE");
  assert.equal(normalizeDeviceCatalogVisibility("enterprise_shared"), "ENTERPRISE_SHARED");
  assert.throws(() => normalizeDeviceCatalogVisibility("PUBLIC"), /visibility is invalid/);
});

test("device revision validation preserves camera and PoE attributes", () => {
  const result = normalizeDeviceRevisionInput({
    manufacturer: " Axis ",
    model: " P3265-LVE ",
    category: "CAMERA",
    maxPowerWatts: 11.2,
    poeRequired: true,
    poeStandard: "802.3af",
    cameraResolutionMp: 2,
    lensMinMm: 3.4,
    lensMaxMm: 8.9,
    horizontalFovDegrees: 100,
    provenanceSource: "manufacturer-datasheet",
  });
  assert.equal(result.manufacturer, "Axis");
  assert.equal(result.model, "P3265-LVE");
  assert.equal(result.poeRequired, true);
  assert.equal(result.cameraResolutionMp, 2);
  assert.equal(result.lensMinMm, 3.4);
  assert.equal(result.lensMaxMm, 8.9);
});

test("device revision rejects invalid lens range and FOV", () => {
  const base = {
    manufacturer: "Vendor",
    model: "Cam-1",
    category: "CAMERA" as const,
    provenanceSource: "manual",
  };
  assert.throws(() => normalizeDeviceRevisionInput({ ...base, lensMinMm: 12, lensMaxMm: 4 }), /Lens minimum cannot exceed/);
  assert.throws(() => normalizeDeviceRevisionInput({ ...base, horizontalFovDegrees: 361 }), /outside the supported range/);
});
