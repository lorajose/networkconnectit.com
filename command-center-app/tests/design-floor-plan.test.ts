import assert from "node:assert/strict";
import test from "node:test";

import { designFloorPlanStorageKey, validateDesignFloorPlanUpload } from "../lib/contractor-os/design-floor-plan";

const png = Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00]);
const jpg = Uint8Array.from([0xff,0xd8,0xff,0xe0,0x00]);
const pdf = new TextEncoder().encode("%PDF-1.7\n");

test("accepts PDF, PNG and JPEG only when MIME, extension and magic bytes agree", () => {
  for (const sample of [
    { fileName: "level-1.pdf", mimeType: "application/pdf", bytes: pdf },
    { fileName: "level-1.png", mimeType: "image/png", bytes: png },
    { fileName: "level-1.jpeg", mimeType: "image/jpeg", bytes: jpg },
  ]) {
    const result = validateDesignFloorPlanUpload({ ...sample, byteSize: sample.bytes.byteLength });
    assert.equal(result.mimeType, sample.mimeType);
    assert.match(result.sha256, /^[a-f0-9]{64}$/);
  }
});

test("rejects spoofed content and mismatched extensions", () => {
  assert.throws(() => validateDesignFloorPlanUpload({ fileName: "bad.pdf", mimeType: "application/pdf", byteSize: png.byteLength, bytes: png }), /does not match/);
  assert.throws(() => validateDesignFloorPlanUpload({ fileName: "bad.exe", mimeType: "image/png", byteSize: png.byteLength, bytes: png }), /extension/);
});

test("builds tenant and project scoped storage keys and rejects traversal identifiers", () => {
  assert.equal(designFloorPlanStorageKey("org_1", "project-1", "asset_1", ".pdf"), "design-studio/org_1/project-1/assets/asset_1.pdf");
  assert.throws(() => designFloorPlanStorageKey("../org", "project-1", "asset_1", ".pdf"), /Invalid organization/);
});
