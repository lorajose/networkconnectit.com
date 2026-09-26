import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("private evidence storage reuses canonical private design storage", () => {
  const source = readFileSync(resolve(process.cwd(), "lib/private-evidence/storage.ts"), "utf8");
  assert.match(source, /storePrivateDesignAsset/);
  assert.match(source, /readPrivateDesignAsset/);
  assert.match(source, /deletePrivateDesignAsset/);
  assert.match(source, /DESIGN_STORAGE_DRIVER/);
  assert.match(source, /BID_STORAGE_DRIVER/);
});

test("private evidence storage remains fail closed when configuration is absent", () => {
  const source = readFileSync(resolve(process.cwd(), "lib/private-evidence/storage.ts"), "utf8");
  assert.match(source, /Private evidence storage backend is not configured/);
  assert.match(source, /DESIGN_PRIVATE_STORAGE_ROOT/);
  assert.match(source, /BID_PRIVATE_STORAGE_ROOT/);
  assert.match(source, /DESIGN_SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /BID_SUPABASE_SERVICE_ROLE_KEY/);
});

test("private evidence metadata is derived from the opaque key and restricted to receipt types", () => {
  const source = readFileSync(resolve(process.cwd(), "lib/private-evidence/storage.ts"), "utf8");
  assert.match(source, /application\/pdf/);
  assert.match(source, /image\/jpeg/);
  assert.match(source, /image\/png/);
  assert.match(source, /image\/webp/);
  assert.match(source, /metadata\.fileName !== object\.fileName/);
  assert.match(source, /metadata\.contentType !== object\.contentType/);
});

test("private evidence documentation forbids public asset storage", () => {
  const doc = readFileSync(resolve(process.cwd(), "docs/private-evidence-storage.md"), "utf8");
  assert.match(doc, /Do not place receipts in `public\//);
  assert.match(doc, /tenant\/direct-ID validation/);
  assert.match(doc, /server-side credentials only/);
});
