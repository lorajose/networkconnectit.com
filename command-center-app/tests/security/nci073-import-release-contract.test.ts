import assert from "node:assert/strict";
import test from "node:test";

import {
  DESIGN_FLOOR_PLAN_MIME_TYPES,
  validateDesignFloorPlanUpload,
} from "../../lib/contractor-os/design-floor-plan";

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const pdf = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF\n");

test("NCI-073 import release contract exposes only PDF, PNG and JPEG", () => {
  assert.deepEqual([...DESIGN_FLOOR_PLAN_MIME_TYPES].sort(), [
    "application/pdf",
    "image/jpeg",
    "image/png",
  ]);
  assert.equal(DESIGN_FLOOR_PLAN_MIME_TYPES.includes("application/dxf" as never), false);
  assert.equal(DESIGN_FLOOR_PLAN_MIME_TYPES.includes("image/vnd.dxf" as never), false);
});

test("NCI-073 import release contract accepts implemented floor-plan formats", () => {
  for (const sample of [
    { fileName: "qa-floor.pdf", mimeType: "application/pdf", bytes: pdf },
    { fileName: "qa-floor.png", mimeType: "image/png", bytes: png },
    { fileName: "qa-floor.jpg", mimeType: "image/jpeg", bytes: jpg },
  ]) {
    const result = validateDesignFloorPlanUpload({
      ...sample,
      byteSize: sample.bytes.byteLength,
    });
    assert.equal(result.mimeType, sample.mimeType);
  }
});

test("NCI-073 import release contract rejects DXF and disguised uploads", () => {
  const dxf = new TextEncoder().encode("0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nEOF\n");

  assert.throws(
    () =>
      validateDesignFloorPlanUpload({
        fileName: "qa-floor.dxf",
        mimeType: "application/dxf",
        byteSize: dxf.byteLength,
        bytes: dxf,
      }),
    /not allowed|does not match/,
  );

  assert.throws(
    () =>
      validateDesignFloorPlanUpload({
        fileName: "qa-floor.pdf",
        mimeType: "application/pdf",
        byteSize: png.byteLength,
        bytes: png,
      }),
    /does not match/,
  );
});
