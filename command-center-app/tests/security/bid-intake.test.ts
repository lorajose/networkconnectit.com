import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeBidDocumentMetadata,
  normalizeBidIntakeMetadata,
} from "../../lib/contractor-os/bid-intake";

test("normalizes bid intake metadata", () => {
  const result = normalizeBidIntakeMetadata({
    title: "  Hospital CCTV Bid  ",
    bidDueAt: "2026-09-15T17:00:00-04:00",
    revision: " Rev 2 ",
    notes: "  Include addendum 3  ",
  });

  assert.equal(result.title, "Hospital CCTV Bid");
  assert.equal(result.revision, "Rev 2");
  assert.equal(result.notes, "Include addendum 3");
});

test("rejects an invalid bid due date", () => {
  assert.throws(
    () => normalizeBidIntakeMetadata({ title: "Valid title", bidDueAt: "not-a-date" }),
    /Bid due date is invalid/,
  );
});

test("normalizes classified bid document metadata", () => {
  const result = normalizeBidDocumentMetadata({
    fileName: "  T-101.pdf  ",
    documentType: "DRAWING",
    revision: " A ",
    sourceKey: " tenant/org-1/bids/bid-1/T-101.pdf ",
    sourceMimeType: " application/pdf ",
    sourceSizeBytes: 2048,
  });

  assert.equal(result.fileName, "T-101.pdf");
  assert.equal(result.documentType, "DRAWING");
  assert.equal(result.revision, "A");
  assert.equal(result.sourceMimeType, "application/pdf");
  assert.equal(result.sourceSizeBytes, 2048);
});

test("rejects invalid document sizes and missing storage keys", () => {
  assert.throws(
    () => normalizeBidDocumentMetadata({ fileName: "spec.pdf", documentType: "SPECIFICATION", sourceKey: "", sourceSizeBytes: 10 }),
    /Document storage key is required/,
  );

  assert.throws(
    () => normalizeBidDocumentMetadata({ fileName: "spec.pdf", documentType: "SPECIFICATION", sourceKey: "specs/spec.pdf", sourceSizeBytes: -1 }),
    /Document size is invalid/,
  );
});
