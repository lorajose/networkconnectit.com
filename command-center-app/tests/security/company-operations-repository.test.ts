import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";
import * as policy from "../../lib/company-operations/policy";

// Execute the repository with a database test double; no live connection or secrets.
function repository(options: { technician?: boolean; project?: boolean; workOrder?: boolean; closeout?: boolean; conflict?: boolean; invoice?: { totalAmount: number; paidAmount: number; status: string; subtotal?: number; projectInstallationId?: string | null; workOrderId?: string | null }; profitability?: Array<Record<string, unknown>> } = {}) {
  const events: string[] = [];
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const db = {
    $queryRaw: async (query: { sql: string; values: unknown[] }) => {
      queries.push(query);
      events.push(query.sql.includes("FOR UPDATE") ? "lock" : "read");
      if (query.sql.includes("OperationsInvoice") && query.sql.includes("FOR UPDATE")) return options.invoice ? [{ id: "invoice", projectInstallationId: null, workOrderId: null, ...options.invoice }] : [];
      if (query.sql.includes("FOR UPDATE")) return (query.sql.includes("FieldTechnicianProfile") ? options.technician : options.conflict) ? [{ id: "existing" }] : [];
      if (query.sql.includes("FROM FieldTechnicianProfile") && query.sql.includes("WHERE id =")) return options.technician ? [{ id: "tech", hourlyPayRate: 50 }] : [];
      if (query.sql.includes("FROM ProjectInstallation") && query.sql.includes("WHERE id =")) return options.project ? [{ id: "project" }] : [];
      if (query.sql.includes("FROM ProjectWorkOrder")) return options.workOrder ? [{ id: "work-order", surveySessionId: "survey" }] : [];
      if (query.sql.includes("FROM ProjectCloseoutPackage")) return options.closeout ? [{ id: "closeout" }] : [];
      if (query.sql.includes("AS laborCost") && query.sql.includes("FROM ProjectInstallation p")) return options.profitability ?? [];
      if (query.sql.includes("AS technicianCount")) return [{ technicianCount: BigInt(120), upcomingAssignments: BigInt(80), laborHours: 90, scheduledHours: 120, overdueInvoices: BigInt(3), invoiced: 10000, outstanding: 4000, expenses: 2500 }];
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

test("viewer reads stay tenant-scoped while operations writes are denied before database access", async () => {
  const read = repository();
  const viewer = { id: "v", role: "VIEWER", organizationId: "a" };
  const snapshot = await read.api.getOperationsSnapshot(viewer, "a") as { organizationId: string };
  assert.equal(snapshot.organizationId, "a");
  await assert.rejects(() => read.api.getOperationsSnapshot(viewer, "b"), /outside your tenant/);

  for (const name of ["createTechnician", "createInvoice", "createExpense", "createTimeEntry", "createScheduleEntry"]) {
    const write = repository();
    await assert.rejects(() => write.api[name](viewer, { organizationId: "a" }), /administrator/);
    assert.equal(write.queries.length, 0);
  }
});

test("invalid inputs fail before any write and zero hourly rate is persisted", async () => {
  const { api, queries } = repository();
  const admin = { id: "a", role: "INTERNAL_ADMIN", organizationId: null };
  await assert.rejects(() => api.updateInvoiceAdjustments(admin, { invoiceId: "invoice", taxAmount: Infinity, discountAmount: 0 }));
  await assert.rejects(() => api.createTimeEntry(admin, { technicianProfileId: "t", workDate: "2026-09-24", regularHours: 23, overtimeHours: 2 }));
  await assert.rejects(() => api.createTechnician(admin, { displayName: "Test", workerType: "W2" }), /Organization is required/);
  assert.equal(queries.length, 0);
  await api.createTechnician(admin, { organizationId: "org", displayName: "Test", workerType: "W2", hourlyPayRate: 0 });
  assert.equal(queries.filter(query => query.sql.includes("INSERT INTO FieldTechnicianProfile")).length, 1);
  assert.ok(queries.find(query => query.sql.includes("INSERT INTO FieldTechnicianProfile"))!.values.includes(0));
});

test("material expenses require purchased/used quantities and reject overuse before writing", async () => {
  const admin = { id: "a", role: "CLIENT_ADMIN", organizationId: "org" };
  const invalid = repository();
  await assert.rejects(() => invalid.api.createExpense(admin, {
    category: "MATERIALS", description: "Cat6", amount: 100, expenseDate: "2026-09-24", reimbursable: false,
    materialQuantityPurchased: 100, materialQuantityUsed: 101, materialUnit: "ft"
  }), /cannot exceed/);
  assert.equal(invalid.queries.length, 0);

  const valid = repository();
  await valid.api.createExpense(admin, {
    category: "MATERIALS", description: "Cat6", amount: 100, expenseDate: "2026-09-24", reimbursable: false,
    materialQuantityPurchased: 100, materialQuantityUsed: 75, materialUnit: "ft"
  });
  const write = valid.queries.find(query => query.sql.includes("INSERT INTO OperationsExpense"))!;
  assert.ok(write.values.includes(100));
  assert.ok(write.values.includes(75));
  assert.ok(write.values.includes("ft"));

  const travel = repository();
  await travel.api.createExpense(admin, {
    category: "TRAVEL", description: "Parking", amount: 20, expenseDate: "2026-09-24", reimbursable: true
  });
  const travelWrite = travel.queries.find(query => query.sql.includes("INSERT INTO OperationsExpense"))!;
  assert.equal(travelWrite.values.filter(value => value === null).length >= 4, true);
});

test("expense receipt references are tenant-scoped and bind storage keys to the expense", async () => {
  const admin = { id: "a", role: "CLIENT_ADMIN", organizationId: "org" };

  const invalidKey = repository();
  await assert.rejects(() => invalidKey.api.attachExpenseReceipt(admin, {
    expenseId: "expense", storageKey: "organizations/other/expenses/expense/receipt.pdf"
  }), /outside your tenant scope/);
  assert.equal(invalidKey.queries.length, 0);

  const owned = repository();
  await owned.api.attachExpenseReceipt(admin, {
    expenseId: "expense", storageKey: "organizations/org/expenses/expense/receipt.pdf"
  });
  const update = owned.queries.find(query => query.sql.includes("UPDATE OperationsExpense"))!;
  assert.ok(update.values.includes("expense"));
  assert.ok(update.values.includes("org"));

  const foreign = repository();
  await assert.rejects(() => foreign.api.getExpenseReceiptReference(admin, { expenseId: "foreign" }), /outside your tenant scope/);
  const read = foreign.queries.find(query => query.sql.includes("FROM OperationsExpense"))!;
  assert.ok(read.values.includes("foreign"));
  assert.ok(read.values.includes("org"));
});

test("dashboard uses organization aggregates rather than capped detail rows", async () => {
  const { api, queries } = repository();
  const result = await api.getOperationsSnapshot({ id: "a", role: "CLIENT_ADMIN", organizationId: "org" }) as { metrics: Record<string, number>; invoices: unknown[] };
  assert.equal(result.invoices.length, 0);
  assert.deepEqual(result.metrics, { technicianCount: 120, upcomingAssignments: 80, laborHours: 90, scheduledHours: 120, utilizationPercent: 75, overdueInvoices: 3, invoiced: 10000, outstanding: 4000, expenses: 2500 });
  const aggregate = queries.find(query => query.sql.includes("AS technicianCount"))!;
  assert.deepEqual(aggregate.values, Array(8).fill("org"));
  assert.doesNotMatch(aggregate.sql, /LIMIT/);
  assert.equal((aggregate.sql.match(/status IN \('SENT', 'PAID', 'OVERDUE'\)/g) ?? []).length, 2);
});

const scheduleActor = { id: "admin", role: "CLIENT_ADMIN", organizationId: "org" };
const scheduleInput = { technicianProfileId: "tech", title: "Job", startsAt: "2026-09-25T10:00:00Z", endsAt: "2026-09-25T11:00:00Z", entryType: "ASSIGNMENT" };

test("booking locks the technician and conflict query before inserting within one transaction", async () => {
  const { api, queries, events } = repository({ technician: true });
  await api.createScheduleEntry(scheduleActor, scheduleInput);
  assert.deepEqual(events, ["begin", "lock", "lock", "write", "write", "commit"]);
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
  assert.deepEqual(events, ["begin", "lock", "write", "write", "commit"]);
});

test("invalid schedule intervals are rejected before starting a transaction", async () => {
  for (const endsAt of ["invalid", scheduleInput.startsAt, "2026-09-25T09:00:00Z"]) {
    const { api, events } = repository({ technician: true });
    await assert.rejects(() => api.createScheduleEntry(scheduleActor, { ...scheduleInput, endsAt }), /after start/);
    assert.deepEqual(events, []);
  }
});


test("project-linked assignments require a project from the same tenant", async () => {
  const foreign = repository({ technician: true });
  await assert.rejects(
    () => foreign.api.createScheduleEntry(scheduleActor, { ...scheduleInput, projectInstallationId: "foreign-project" }),
    /Project is outside your tenant scope/
  );
  assert.deepEqual(foreign.events, ["begin", "lock", "read", "rollback"]);

  const owned = repository({ technician: true, project: true });
  await owned.api.createScheduleEntry(scheduleActor, { ...scheduleInput, projectInstallationId: "project" });
  assert.deepEqual(owned.events, ["begin", "lock", "read", "lock", "write", "write", "commit"]);
  const insert = owned.queries.find(query => query.sql.includes("INSERT INTO OperationsScheduleEntry"))!;
  assert.ok(insert.values.includes("project"));
});


test("time and expense project links reject foreign projects and persist owned projects", async () => {
  const admin = { id: "admin", role: "CLIENT_ADMIN", organizationId: "org" };
  const foreignTime = repository({ technician: true });
  await assert.rejects(() => foreignTime.api.createTimeEntry(admin, {
    technicianProfileId: "tech", projectInstallationId: "foreign", workDate: "2026-09-24", regularHours: 8, overtimeHours: 0
  }), /Project is outside your tenant scope/);
  assert.equal(foreignTime.queries.some(query => query.sql.includes("INSERT INTO OperationsTimeEntry")), false);

  const ownedTime = repository({ technician: true, project: true });
  await ownedTime.api.createTimeEntry(admin, {
    technicianProfileId: "tech", projectInstallationId: "project", workDate: "2026-09-24", regularHours: 8, overtimeHours: 0
  });
  assert.ok(ownedTime.queries.find(query => query.sql.includes("INSERT INTO OperationsTimeEntry"))!.values.includes("project"));

  const foreignExpense = repository();
  await assert.rejects(() => foreignExpense.api.createExpense(admin, {
    projectInstallationId: "foreign", category: "MATERIALS", description: "Cable", amount: 100, expenseDate: "2026-09-24", reimbursable: false
  }), /Project is outside your tenant scope/);
  assert.equal(foreignExpense.queries.some(query => query.sql.includes("INSERT INTO OperationsExpense")), false);

  const ownedExpense = repository({ project: true });
  await ownedExpense.api.createExpense(admin, {
    projectInstallationId: "project", category: "MATERIALS", description: "Cable", amount: 100, expenseDate: "2026-09-24", reimbursable: false,
    materialQuantityPurchased: 100, materialQuantityUsed: 75, materialUnit: "ft"
  });
  assert.ok(ownedExpense.queries.find(query => query.sql.includes("INSERT INTO OperationsExpense"))!.values.includes("project"));
});


test("invoice project links are tenant-scoped", async () => {
  const admin = { id: "admin", role: "CLIENT_ADMIN", organizationId: "org" };
  const foreign = repository();
  await assert.rejects(() => foreign.api.createInvoice(admin, {
    projectInstallationId: "foreign", invoiceNumber: "INV-1", customerName: "Client", totalAmount: 100
  }), /Project is outside your tenant scope/);
  assert.equal(foreign.queries.some(query => query.sql.includes("INSERT INTO OperationsInvoice")), false);

  const owned = repository({ project: true });
  await owned.api.createInvoice(admin, {
    projectInstallationId: "project", invoiceNumber: "INV-1", customerName: "Client", totalAmount: 100
  });
  assert.ok(owned.queries.find(query => query.sql.includes("INSERT INTO OperationsInvoice"))!.values.includes("project"));
});

test("payments lock invoice, reject drafts and overpayment, and atomically update paid amount", async () => {
  const admin = { id: "admin", role: "CLIENT_ADMIN", organizationId: "org" };

  const draft = repository({ invoice: { totalAmount: 100, paidAmount: 0, status: "DRAFT" } });
  await assert.rejects(() => draft.api.recordInvoicePayment(admin, {
    invoiceId: "invoice", amount: 10, paidAt: "2026-09-24T12:00:00Z"
  }), /Draft invoices/);
  assert.deepEqual(draft.events, ["begin", "lock", "rollback"]);

  const over = repository({ invoice: { totalAmount: 100, paidAmount: 80, status: "SENT" } });
  await assert.rejects(() => over.api.recordInvoicePayment(admin, {
    invoiceId: "invoice", amount: 30, paidAt: "2026-09-24T12:00:00Z"
  }), /exceeds/);
  assert.deepEqual(over.events, ["begin", "lock", "rollback"]);

  const paid = repository({ invoice: { totalAmount: 100, paidAmount: 80, status: "SENT" } });
  await paid.api.recordInvoicePayment(admin, {
    invoiceId: "invoice", amount: 20, paidAt: "2026-09-24T12:00:00Z", method: "ACH"
  });
  assert.deepEqual(paid.events, ["begin", "lock", "write", "write", "write", "commit"]);
  const update = paid.queries.find(query => query.sql.includes("UPDATE OperationsInvoice"))!;
  assert.ok(update.values.includes(100));
  assert.ok(update.values.includes("PAID"));
});


test("dashboard derives utilization and overdue alerts from organization aggregates", async () => {
  const { api, queries } = repository();
  const result = await api.getOperationsSnapshot({ id: "admin", role: "CLIENT_ADMIN", organizationId: "org" }) as { metrics: Record<string, number | null> };
  assert.equal(result.metrics.scheduledHours, 120);
  assert.equal(result.metrics.utilizationPercent, 75);
  assert.equal(result.metrics.overdueInvoices, 3);
  const aggregate = queries.find(query => query.sql.includes("AS technicianCount"))!;
  assert.match(aggregate.sql, /TIMESTAMPDIFF/);
  assert.match(aggregate.sql, /workDate >= DATE_SUB\(CURRENT_DATE\(\), INTERVAL 30 DAY\)/);
  assert.match(aggregate.sql, /endsAt > DATE_SUB\(CURRENT_DATE\(\), INTERVAL 30 DAY\)/);
  assert.match(aggregate.sql, /startsAt < DATE_ADD\(CURRENT_DATE\(\), INTERVAL 1 DAY\)/);
  assert.doesNotMatch(aggregate.sql, /DATE_ADD\(NOW\(\), INTERVAL 30 DAY\)/);
  assert.match(aggregate.sql, /dueDate < CURRENT_DATE\(\)/);
  assert.match(aggregate.sql, /paidAmount < totalAmount/);
});

test("project profitability uses linked labor, expenses and issued invoices", async () => {
  const { api, queries } = repository({ profitability: [{
    id: "project", name: "Bronx Cabling", projectCode: "WO-001",
    laborCost: 1200, expenses: 330, revenue: 4980, outstanding: 4980
  }] });
  const result = await api.getOperationsSnapshot({ id: "admin", role: "CLIENT_ADMIN", organizationId: "org" }) as {
    projectProfitability: Array<{ laborCost: number; expenses: number; revenue: number; outstanding: number; grossProfit: number; marginPercent: number | null }>;
  };
  assert.equal(result.projectProfitability[0].grossProfit, 3450);
  assert.ok(Math.abs((result.projectProfitability[0].marginPercent ?? 0) - 69.2771084337) < 0.0001);
  const query = queries.find(item => item.sql.includes("AS laborCost") && item.sql.includes("FROM ProjectInstallation p"))!;
  assert.match(query.sql, /overtimeHours \* 1\.5/);
  assert.match(query.sql, /hourlyPayRateSnapshot/);
  assert.match(query.sql, /projectInstallationId = p\.id/);
  assert.equal((query.sql.match(/status IN \('SENT', 'PAID', 'OVERDUE'\)/g) ?? []).length, 2);
});




test("overdue synchronization is tenant-scoped and only advances unpaid SENT invoices", async () => {
  const admin = { id: "admin", role: "CLIENT_ADMIN", organizationId: "org" };
  const repo = repository();
  const updated = await repo.api.syncOverdueInvoices(admin);
  assert.equal(updated, 1);
  const query = repo.queries.find(query => query.sql.includes("SET status = 'OVERDUE'"))!;
  assert.ok(query.values.includes("org"));
  assert.match(query.sql, /status = 'SENT'/);
  assert.match(query.sql, /dueDate < CURRENT_DATE\(\)/);
  assert.match(query.sql, /paidAmount < totalAmount/);
});


test("client-safe invoice read model is tenant-scoped and excludes internal operations data", async () => {
  const admin = { id: "admin", role: "CLIENT_ADMIN", organizationId: "org" };
  const missing = repository();
  await assert.rejects(() => missing.api.getClientSafeInvoice(admin, { invoiceId: "foreign" }), /outside your tenant scope/);
  const invoiceQuery = missing.queries.find(query => query.sql.includes("FROM OperationsInvoice i"))!;
  assert.ok(invoiceQuery.values.includes("foreign"));
  assert.ok(invoiceQuery.values.includes("org"));
  assert.doesNotMatch(invoiceQuery.sql, /hourlyPayRate|OperationsExpense|FieldTechnicianProfile/);
});


test("invoice lines require a tenant-owned draft and recalculate totals atomically", async () => {
  const admin = { id: "admin", role: "CLIENT_ADMIN", organizationId: "org" };

  const foreign = repository();
  await assert.rejects(() => foreign.api.addInvoiceLine(admin, {
    invoiceId: "foreign", lineType: "LABOR", description: "Cable runs", quantity: 2, unitPrice: 150
  }), /outside your tenant scope/);
  assert.deepEqual(foreign.events, ["begin", "lock", "rollback"]);

  const sent = repository({ invoice: { totalAmount: 300, paidAmount: 0, status: "SENT" } });
  await assert.rejects(() => sent.api.addInvoiceLine(admin, {
    invoiceId: "invoice", lineType: "LABOR", description: "Cable runs", quantity: 2, unitPrice: 150
  }), /Only draft invoices/);
  assert.deepEqual(sent.events, ["begin", "lock", "rollback"]);

  const draft = repository({ invoice: { totalAmount: 0, paidAmount: 0, status: "DRAFT" } });
  await draft.api.addInvoiceLine(admin, {
    invoiceId: "invoice", lineType: "LABOR", description: "Cable runs", quantity: 2, unitPrice: 150
  });
  assert.deepEqual(draft.events, ["begin", "lock", "write", "write", "write", "commit"]);
  const insert = draft.queries.find(query => query.sql.includes("INSERT INTO OperationsInvoiceLine"))!;
  assert.ok(insert.values.includes(300));
  const update = draft.queries.find(query => query.sql.includes("UPDATE OperationsInvoice i"))!;
  assert.match(update.sql, /SUM\(l\.amount\)/);
});



test("invoice tax and discount adjustments are draft-only, tenant-scoped and derived from subtotal", async () => {
  const admin = { id: "admin", role: "CLIENT_ADMIN", organizationId: "org" };

  const foreign = repository();
  await assert.rejects(() => foreign.api.updateInvoiceAdjustments(admin, {
    invoiceId: "foreign", taxAmount: 25, discountAmount: 10
  }), /outside your tenant scope/);
  assert.deepEqual(foreign.events, ["begin", "lock", "rollback"]);

  const sent = repository({ invoice: { totalAmount: 300, paidAmount: 0, status: "SENT", subtotal: 300 } });
  await assert.rejects(() => sent.api.updateInvoiceAdjustments(admin, {
    invoiceId: "invoice", taxAmount: 25, discountAmount: 10
  }), /Only draft invoices/);
  assert.deepEqual(sent.events, ["begin", "lock", "rollback"]);

  const draft = repository({ invoice: { totalAmount: 300, paidAmount: 0, status: "DRAFT", subtotal: 300 } });
  const total = await draft.api.updateInvoiceAdjustments(admin, {
    invoiceId: "invoice", taxAmount: 25, discountAmount: 10
  });
  assert.equal(total, 315);
  assert.deepEqual(draft.events, ["begin", "lock", "write", "write", "commit"]);
  const update = draft.queries.find(query => query.sql.includes("taxAmount ="))!;
  assert.ok(update.values.includes(25));
  assert.ok(update.values.includes(10));
  assert.ok(update.values.includes(315));
});


test("time approval lifecycle is tenant-scoped and state constrained", async () => {
  const admin = { id: "approver", role: "CLIENT_ADMIN", organizationId: "org" };

  const submitted = repository();
  await submitted.api.submitTimeEntry(admin, { timeEntryId: "time" });
  const submit = submitted.queries.find(query => query.sql.includes("UPDATE OperationsTimeEntry"))!;
  assert.match(submit.sql, /status = 'DRAFT'/);
  assert.ok(submit.values.includes("org"));

  const approved = repository();
  await approved.api.approveTimeEntry(admin, { timeEntryId: "time" });
  const approve = approved.queries.find(query => query.sql.includes("UPDATE OperationsTimeEntry"))!;
  assert.match(approve.sql, /status = 'SUBMITTED'/);
  assert.match(approve.sql, /approvedByUserId/);
  assert.ok(approve.values.includes("approver"));
  assert.ok(approve.values.includes("org"));
});

test("canonical work order links are tenant and project scoped across operations", async () => {
  const admin = { id: "admin", role: "CLIENT_ADMIN", organizationId: "org" };

  const foreign = repository({ project: true });
  await assert.rejects(() => foreign.api.createInvoice(admin, {
    projectInstallationId: "project", workOrderId: "foreign-work-order", invoiceNumber: "INV-WO-1", customerName: "Client"
  }), /Work order is outside your tenant or project scope/);
  assert.equal(foreign.queries.some(query => query.sql.includes("INSERT INTO OperationsInvoice")), false);
  const lookup = foreign.queries.find(query => query.sql.includes("FROM ProjectWorkOrder"))!;
  assert.ok(lookup.values.includes("foreign-work-order"));
  assert.ok(lookup.values.includes("org"));
  assert.ok(lookup.values.includes("project"));

  const missingProject = repository({ workOrder: true });
  await assert.rejects(() => missingProject.api.createExpense(admin, {
    workOrderId: "work-order", category: "TRAVEL", description: "Parking", amount: 20, expenseDate: "2026-09-24", reimbursable: false
  }), /Work order requires a project/);
  assert.equal(missingProject.queries.some(query => query.sql.includes("FROM ProjectWorkOrder")), false);

  const withoutCloseout = repository({ project: true, workOrder: true });
  await assert.rejects(() => withoutCloseout.api.createInvoice(admin, {
    projectInstallationId: "project", workOrderId: "work-order", invoiceNumber: "INV-WO-NO-CLOSEOUT", customerName: "Client"
  }), /closed work order with a generated closeout package/);
  assert.equal(withoutCloseout.queries.some(query => query.sql.includes("INSERT INTO OperationsInvoice")), false);

  const ownedInvoice = repository({ project: true, workOrder: true, closeout: true });
  await ownedInvoice.api.createInvoice(admin, {
    projectInstallationId: "project", workOrderId: "work-order", invoiceNumber: "INV-WO-2", customerName: "Client"
  });
  const invoiceWrite = ownedInvoice.queries.find(query => query.sql.includes("INSERT INTO OperationsInvoice"))!;
  assert.ok(invoiceWrite.values.includes("work-order"));

  const ownedExpense = repository({ project: true, workOrder: true });
  await ownedExpense.api.createExpense(admin, {
    projectInstallationId: "project", workOrderId: "work-order", category: "TRAVEL", description: "Parking", amount: 20, expenseDate: "2026-09-24", reimbursable: false
  });
  assert.ok(ownedExpense.queries.find(query => query.sql.includes("INSERT INTO OperationsExpense"))!.values.includes("work-order"));

  const ownedTime = repository({ technician: true, project: true, workOrder: true });
  await ownedTime.api.createTimeEntry(admin, {
    technicianProfileId: "tech", projectInstallationId: "project", workOrderId: "work-order", workDate: "2026-09-24", regularHours: 8, overtimeHours: 0
  });
  assert.ok(ownedTime.queries.find(query => query.sql.includes("INSERT INTO OperationsTimeEntry"))!.values.includes("work-order"));

  const ownedSchedule = repository({ technician: true, project: true, workOrder: true });
  await ownedSchedule.api.createScheduleEntry(admin, { ...scheduleInput, projectInstallationId: "project", workOrderId: "work-order" });
  assert.ok(ownedSchedule.queries.find(query => query.sql.includes("INSERT INTO OperationsScheduleEntry"))!.values.includes("work-order"));
});

test("work order invoice payments append canonical lifecycle audit events atomically", async () => {
  const admin = { id: "admin", role: "CLIENT_ADMIN", organizationId: "org" };
  const partial = repository({ workOrder: true, invoice: { totalAmount: 100, paidAmount: 0, status: "SENT", projectInstallationId: "project", workOrderId: "work-order" } });
  await partial.api.recordInvoicePayment(admin, { invoiceId: "invoice", amount: 40, paidAt: "2026-09-25T12:00:00Z" });
  const partialEvent = partial.queries.find(query => query.sql.includes("INSERT INTO ProjectActivityEvent"))!;
  assert.ok(partialEvent.values.includes("INVOICE_PAYMENT_RECORDED"));
  assert.ok(partialEvent.values.includes("work-order"));
  assert.ok(partialEvent.values.includes("project"));
  assert.deepEqual(partial.events.slice(-1), ["commit"]);

  const final = repository({ workOrder: true, invoice: { totalAmount: 100, paidAmount: 40, status: "SENT", projectInstallationId: "project", workOrderId: "work-order" } });
  await final.api.recordInvoicePayment(admin, { invoiceId: "invoice", amount: 60, paidAt: "2026-09-25T13:00:00Z" });
  const finalEvent = final.queries.find(query => query.sql.includes("INSERT INTO ProjectActivityEvent"))!;
  assert.ok(finalEvent.values.includes("INVOICE_PAID"));
  assert.ok(final.queries.find(query => query.sql.includes("UPDATE OperationsInvoice"))!.values.includes("PAID"));
});
