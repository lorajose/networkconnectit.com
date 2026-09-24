import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";
import * as policy from "../../lib/company-operations/policy";

// Execute the repository with a database test double; no live connection or secrets.
function repository() {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const db = {
    $queryRaw: async (query: { sql: string; values: unknown[] }) => {
      queries.push(query);
      if (query.sql.includes("AS technicianCount")) return [{ technicianCount: 120n, upcomingAssignments: 80n, laborHours: 900, invoiced: 10000, outstanding: 4000, expenses: 2500 }];
      return [];
    },
    $executeRaw: async (query: { sql: string; values: unknown[] }) => { queries.push(query); return 1; }
  };
  const source = readFileSync(resolve(process.cwd(), "lib/company-operations/repository.ts"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} as Record<string, (...args: unknown[]) => Promise<unknown>> };
  const requireMock = (name: string) => {
    if (name === "@/lib/db") return { prisma: db };
    if (name === "./policy") return policy;
    if (name === "crypto") return { randomUUID: () => "test-id" };
    if (name === "@prisma/client") return { Prisma: { sql: (parts: TemplateStringsArray, ...values: unknown[]) => ({ sql: parts.join("?"), values }) } };
    throw new Error(`Unexpected import: ${name}`);
  };
  new Function("require", "module", "exports", compiled)(requireMock, module, module.exports);
  return { api: module.exports, queries };
}

test("every operations repository entry point denies viewers before database access", async () => {
  const { api, queries } = repository();
  const viewer = { id: "v", role: "VIEWER", organizationId: "a" };
  for (const name of ["getOperationsSnapshot", "createTechnician", "createInvoice", "createExpense", "createTimeEntry", "createScheduleEntry"]) {
    await assert.rejects(() => api[name](viewer, name === "getOperationsSnapshot" ? "a" : { organizationId: "a" }), /administrator/);
  }
  assert.equal(queries.length, 0);
});

test("invalid inputs fail before any write and zero hourly rate is persisted", async () => {
  const { api, queries } = repository();
  const admin = { id: "a", role: "CLIENT_ADMIN", organizationId: "org" };
  await assert.rejects(() => api.createInvoice(admin, { invoiceNumber: "INV", customerName: "Test", totalAmount: Infinity }));
  await assert.rejects(() => api.createTimeEntry(admin, { technicianProfileId: "t", workDate: "2026-09-24", regularHours: 23, overtimeHours: 2 }));
  await assert.rejects(() => api.createTechnician(admin, { organizationId: "other", displayName: "Test", workerType: "W2" }), /tenant/);
  assert.equal(queries.length, 0);
  await api.createTechnician(admin, { displayName: "Test", workerType: "W2", hourlyPayRate: 0 });
  assert.equal(queries.length, 1);
  assert.ok(queries[0].values.includes(0));
});

test("dashboard uses organization aggregates rather than capped detail rows", async () => {
  const { api, queries } = repository();
  const result = await api.getOperationsSnapshot({ id: "a", role: "CLIENT_ADMIN", organizationId: "org" }) as { metrics: Record<string, number>; invoices: unknown[] };
  assert.equal(result.invoices.length, 0);
  assert.deepEqual(result.metrics, { technicianCount: 120, upcomingAssignments: 80, laborHours: 900, invoiced: 10000, outstanding: 4000, expenses: 2500 });
  const aggregate = queries.find(query => query.sql.includes("AS technicianCount"))!;
  assert.deepEqual(aggregate.values, Array(6).fill("org"));
  assert.doesNotMatch(aggregate.sql, /LIMIT/);
  assert.equal((aggregate.sql.match(/status IN \('SENT', 'PAID', 'OVERDUE'\)/g) ?? []).length, 2);
});
