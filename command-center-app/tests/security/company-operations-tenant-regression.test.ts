import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migration = readFileSync(resolve(process.cwd(), "prisma/migrations/20260924210000_nci075_082_company_operations/migration.sql"), "utf8");
const repository = readFileSync(resolve(process.cwd(), "lib/company-operations/repository.ts"), "utf8");
const policy = readFileSync(resolve(process.cwd(), "lib/company-operations/policy.ts"), "utf8");

test("company operations migration keeps every operational table tenant-scoped", () => {
  for (const table of ["OperationsScheduleEntry", "OperationsTimeEntry", "OperationsInvoice", "OperationsInvoiceLine", "OperationsPayment", "OperationsExpense"]) {
    assert.match(migration, new RegExp(`CREATE TABLE ${table}[^]*organizationId VARCHAR\\(191\\) NOT NULL`));
  }
});

test("operations repository resolves organization scope before reads and writes", () => {
  assert.match(policy, /function scopedOrganizationId/);
  assert.match(policy, /Organization is outside your tenant scope/);
  assert.match(repository, /WHERE organizationId = \$\{organizationId\}/);
  assert.match(repository, /AND organizationId = \$\{organizationId\}/);
});

test("schedule creation includes overlap conflict protection", () => {
  assert.match(repository, /startsAt < \$\{endsAt\} AND endsAt > \$\{startsAt\}/);
  assert.match(repository, /Technician already has a conflicting schedule entry/);
});

test("time entry snapshots technician pay rate instead of recalculating history", () => {
  assert.match(migration, /hourlyPayRateSnapshot DECIMAL\(12,2\)/);
  assert.match(repository, /hourlyPayRateSnapshot/);
});
