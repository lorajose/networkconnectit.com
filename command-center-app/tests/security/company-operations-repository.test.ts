import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";
import * as policy from "../../lib/company-operations/policy";

// Execute the repository with a database test double; no live connection or secrets.
function repository(options: { technician?: boolean; conflict?: boolean } = {}) {
  const events: string[] = [];
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const db = {
    $queryRaw: async (query: { sql: string; values: unknown[] }) => {
      queries.push(query);
      events.push(query.sql.includes("FOR UPDATE") ? "lock" : "read");
      if (query.sql.includes("FOR UPDATE")) return (query.sql.includes("FieldTechnicianProfile") ? options.technician : options.conflict) ? [{ id: "existing" }] : [];
      if (query.sql.includes("AS technicianCount")) return [{ technicianCount: BigInt(120), upcomingAssignments: BigInt(80), laborHours: 900, invoiced: 10000, outstanding: 4000, expenses: 2500 }];
      return [];
    },
    $executeRaw: async (query: { sql: string; values: unknown[] }) => { queries.push(query); events.push("write"); return 1; }
  };
  const transactionalDb = { ...db, $transaction: async (work: (tx: typeof db) => Promise<unknown>) => {
    events.push("begin");
    try { const result = await work(db); events.push("commit"); return result; }
    catch (error) { events.push("rollback"); throw error; }
  } };
  const source = readFileSync(resolve(process.cwd(), "lib/company-operations/repository.ts"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} as Record<string, (...args: unknown[]) => Promise<unknown>> };
  const requireMock = (name: string) => {
    if (name === "@/lib/db") return { prisma: transactionalDb };
    if (name === "./policy") return policy;
    if (name === "crypto") return { randomUUID: () => "test-id" };
    if (name === "@prisma/client") return { Prisma: { sql: (parts: TemplateStringsArray, ...values: unknown[]) => ({ sql: parts.join("?"), values }) } };
    throw new Error(`Unexpected import: ${name}`);
  };
  new Function("require", "module", "exports", compiled)(requireMock, module, module.exports);
  return { api: module.exports, queries, events };
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

const scheduleActor = { id: "admin", role: "CLIENT_ADMIN", organizationId: "org" };
const scheduleInput = { technicianProfileId: "tech", title: "Job", startsAt: "2026-09-25T10:00:00Z", endsAt: "2026-09-25T11:00:00Z", entryType: "ASSIGNMENT" };

test("booking locks the technician and conflict query before inserting within one transaction", async () => {
  const { api, queries, events } = repository({ technician: true });
  await api.createScheduleEntry(scheduleActor, scheduleInput);
  assert.deepEqual(events, ["begin", "lock", "lock", "write", "commit"]);
  assert.deepEqual(queries[0].values, ["tech", "org"]);
  assert.match(queries[0].sql, /status = 'ACTIVE'/);
  assert.match(queries[1].sql, /entryType <> 'AVAILABLE'/);
  assert.match(queries[1].sql, /status <> 'CANCELLED'/);
  assert.match(queries[1].sql, /startsAt < \? AND endsAt > \?/);
});

test("conflicts and inactive or foreign technicians abort before insertion", async () => {
  const blocked = repository({ technician: true, conflict: true });
  await assert.rejects(() => blocked.api.createScheduleEntry(scheduleActor, scheduleInput), /conflicting/);
  assert.deepEqual(blocked.events, ["begin", "lock", "lock", "rollback"]);
  const missing = repository();
  await assert.rejects(() => missing.api.createScheduleEntry(scheduleActor, scheduleInput), /inactive or outside/);
  assert.deepEqual(missing.events, ["begin", "lock", "rollback"]);
});

test("advisory availability does not reserve time but still requires a tenant-owned active technician", async () => {
  const { api, events } = repository({ technician: true, conflict: true });
  await api.createScheduleEntry(scheduleActor, { ...scheduleInput, entryType: "AVAILABLE" });
  assert.deepEqual(events, ["begin", "lock", "write", "commit"]);
});

test("invalid schedule intervals are rejected before starting a transaction", async () => {
  for (const endsAt of ["invalid", scheduleInput.startsAt, "2026-09-25T09:00:00Z"]) {
    const { api, events } = repository({ technician: true });
    await assert.rejects(() => api.createScheduleEntry(scheduleActor, { ...scheduleInput, endsAt }), /after start/);
    assert.deepEqual(events, []);
  }
});
