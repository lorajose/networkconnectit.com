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

test("receipt route resolves evidence through tenant-scoped repository and never returns the storage key", () => {
  const source = route();
  assert.match(source, /getExpenseReceiptReference\(actor/);
  assert.match(source, /expenseId: context\.params\.expenseId/);
  assert.doesNotMatch(source, /storageKey\s*:/);
  assert.match(source, /Cache-Control": "no-store"/);
});

test("receipt route fails closed until physical private storage exists", () => {
  const source = route();
  assert.match(source, /status: 503/);
  assert.match(source, /Private receipt storage backend is not configured/);
  assert.match(source, /Receipt not found/);
});
