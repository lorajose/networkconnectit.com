import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const route = () => readFileSync(
  resolve(process.cwd(), "app/api/operations/expenses/[expenseId]/receipt/route.ts"),
  "utf8"
);
const apiAuth = () => readFileSync(resolve(process.cwd(), "lib/api-auth.ts"), "utf8");

test("receipt route requires existing Company Operations RBAC", () => {
  const source = route();
  assert.match(source, /requireApiRoles\(routeAccess\.companyOperations\)/);
  assert.match(apiAuth(), /hasRequiredRole\(user\.role, allowedRoles\)/);
  assert.match(apiAuth(), /status: 401/);
  assert.match(apiAuth(), /status: 403/);
});

test("receipt route resolves evidence through tenant-scoped repository and private storage", () => {
  const source = route();
  assert.match(source, /getExpenseReceiptReference\(actor/);
  assert.match(source, /expenseId: context\.params\.expenseId/);
  assert.match(source, /privateEvidenceStorage\(\)\.get\(receipt\.storageKey\)/);
  assert.doesNotMatch(source, /storageKey\s*:/);
});

test("receipt download uses private anti-sniff response headers", () => {
  const source = route();
  assert.match(source, /"Cache-Control": "private, no-store"/);
  assert.match(source, /"Content-Type": object\.contentType/);
  assert.match(source, /"Content-Disposition"/);
  assert.match(source, /attachment; filename=/);
  assert.match(source, /"X-Content-Type-Options": "nosniff"/);
});

test("receipt route remains fail closed without a physical storage backend", () => {
  const source = route();
  assert.match(source, /status: 503/);
  assert.match(source, /Private receipt storage backend is not configured/);
  assert.match(source, /status: 404/);
  assert.match(source, /Receipt not found/);
  assert.match(source, /"Cache-Control": "no-store"/);
});
