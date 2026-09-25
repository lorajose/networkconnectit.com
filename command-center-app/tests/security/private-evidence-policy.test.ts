import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

function policy() {
  const source = readFileSync(resolve(process.cwd(), "lib/private-evidence/policy.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }
  }).outputText;
  const module = { exports: {} as Record<string, any> };
  new Function("require", "module", "exports", compiled)(require, module, module.exports);
  return module.exports;
}

test("receipt policy accepts private evidence formats and creates tenant-bound keys", () => {
  const api = policy();
  assert.doesNotThrow(() => api.validateReceiptUpload({
    organizationId: "org_1", expenseId: "expense_1", fileName: "receipt.pdf",
    contentType: "application/pdf", size: 1024
  }));
  assert.equal(api.receiptStorageKey({
    organizationId: "org_1", expenseId: "expense_1", objectId: "obj_1"
  }), "organizations/org_1/expenses/expense_1/obj_1");
});

test("receipt policy rejects dangerous names, types and sizes", () => {
  const api = policy();
  const base = { organizationId: "org", expenseId: "expense", contentType: "application/pdf", size: 1 };
  assert.throws(() => api.validateReceiptUpload({ ...base, fileName: "../receipt.pdf" }), /file name/);
  assert.throws(() => api.validateReceiptUpload({ ...base, fileName: "receipt.exe", contentType: "application/octet-stream" }), /type/);
  assert.throws(() => api.validateReceiptUpload({ ...base, fileName: "receipt.pdf", size: 10 * 1024 * 1024 + 1 }), /size/);
  assert.throws(() => api.receiptStorageKey({ organizationId: "../other", expenseId: "expense", objectId: "obj" }), /Organization/);
});
