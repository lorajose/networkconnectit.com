import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

test("private evidence storage fails closed until a backend is configured", () => {
  const source = readFileSync(resolve(process.cwd(), "lib/private-evidence/storage.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }
  }).outputText;
  const module = { exports: {} as Record<string, () => unknown> };
  new Function("require", "module", "exports", compiled)(() => {
    throw new Error("Unexpected import");
  }, module, module.exports);
  assert.throws(() => module.exports.privateEvidenceStorage(), /not configured/);
});

test("private evidence documentation forbids public asset storage", () => {
  const doc = readFileSync(resolve(process.cwd(), "docs/private-evidence-storage.md"), "utf8");
  assert.match(doc, /Do not place receipts in \`public\//);
  assert.match(doc, /tenant\/direct-ID validation/);
  assert.match(doc, /server-side credentials only/);
});
