// Runs only against the disposable MySQL database provisioned by the CI job.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { PrismaClient, Prisma } = require('@prisma/client');
const url = new URL(process.env.DATABASE_URL || 'mysql://invalid');
if (process.env.CI !== 'true' || url.hostname !== '127.0.0.1' || url.pathname !== '/operations_ci_test') {
  throw new Error('Requires CI=true and the disposable local operations_ci_test database.');
}
const prisma = new PrismaClient();
function load(relative, imports) {
  const source = fs.readFileSync(path.resolve(relative), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)((name) => {
    if (Object.hasOwn(imports, name)) return imports[name];
    if (name === 'crypto') return require('node:crypto');
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  return module.exports;
}
async function main() {
  await prisma.$executeRawUnsafe(`CREATE TABLE FieldTechnicianProfile (
    id VARCHAR(191) NOT NULL PRIMARY KEY, organizationId VARCHAR(191) NOT NULL,
    userId VARCHAR(191) NOT NULL, displayName VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    createdAt DATETIME(3) NOT NULL, updatedAt DATETIME(3) NOT NULL,
    UNIQUE INDEX FieldTechnicianProfile_user_key (organizationId,userId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  for (const migrationPath of [
    'prisma/migrations/20260924210000_nci075_082_company_operations/migration.sql',
    'prisma/migrations/20260925010000_nci079_material_usage/migration.sql',
    'prisma/migrations/20260925130000_nci076_schedule_timezone/migration.sql'
  ]) {
    const migration = fs.readFileSync(migrationPath, 'utf8');
    for (const sql of migration.split(';').map(s => s.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(sql);
  }
  const engines = await prisma.$queryRaw`SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'operations_ci_test'`;
  assert.ok(engines.every(row => row.ENGINE === 'InnoDB'));
  const policy = load('lib/company-operations/policy.ts', {});
  const repo = load('lib/company-operations/repository.ts', { './policy': policy, '@/lib/db': { prisma }, '@prisma/client': { Prisma } });
  const actor = { id: 'admin-a', role: 'CLIENT_ADMIN', organizationId: 'a' };
  const other = { id: 'admin-b', role: 'CLIENT_ADMIN', organizationId: 'b' };
  const technician = await repo.createTechnician(actor, { displayName: 'QA technician', workerType: 'W2', hourlyPayRate: 0 });
  const input = { technicianProfileId: technician, title: 'Concurrent booking', startsAt: '2030-01-01T10:00:00', endsAt: '2030-01-01T11:00:00', timeZone: 'America/New_York', entryType: 'ASSIGNMENT' };
  // Empty schedule: locking existing bookings alone would not protect this case.
  const attempts = await Promise.allSettled([repo.createScheduleEntry(actor, input), repo.createScheduleEntry(actor, input)]);
  assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
  const rejected = attempts.find(r => r.status === 'rejected');
  assert.match(String(rejected.reason), /conflicting schedule/);
  const count = await prisma.$queryRaw`SELECT COUNT(*) AS total FROM OperationsScheduleEntry`;
  assert.equal(Number(count[0].total), 1);
  await repo.createScheduleEntry(actor, { ...input, startsAt: input.endsAt, endsAt: '2030-01-01T12:00:00' });
  await repo.createScheduleEntry(actor, { ...input, entryType: 'AVAILABLE' });
  await assert.rejects(() => repo.createScheduleEntry(actor, { ...input, entryType: 'PTO' }), /conflicting/);
  await assert.rejects(() => repo.createScheduleEntry(other, input), /outside your tenant/);
  await assert.rejects(() => repo.createScheduleEntry({ ...actor, role: 'VIEWER' }, input), /administrator/);
  await prisma.$executeRaw`UPDATE OperationsScheduleEntry SET status = 'CANCELLED' WHERE entryType = 'ASSIGNMENT'`;
  await repo.createScheduleEntry(actor, input); // cancelled and advisory entries do not block
  await prisma.$executeRaw`UPDATE FieldTechnicianProfile SET status = 'INACTIVE' WHERE id = ${technician}`;
  await assert.rejects(() => repo.createScheduleEntry(actor, { ...input, entryType: 'AVAILABLE' }), /inactive/);
  await prisma.$executeRawUnsafe(`CREATE TABLE ProjectInstallation (
    id VARCHAR(191) NOT NULL PRIMARY KEY, organizationId VARCHAR(191) NOT NULL,
    name VARCHAR(191) NOT NULL, projectCode VARCHAR(191) NULL, status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await prisma.$executeRaw`INSERT INTO ProjectInstallation (id, organizationId, name, projectCode, status, updatedAt)
    VALUES ('project-a', 'a', 'CI Project', 'CI-001', 'ACTIVE', NOW(3))`;
  await prisma.$executeRawUnsafe(`CREATE TABLE ProjectWorkOrder (
    id VARCHAR(191) NOT NULL PRIMARY KEY, organizationId VARCHAR(191) NOT NULL,
    projectInstallationId VARCHAR(191) NOT NULL, surveySessionId VARCHAR(191) NOT NULL,
    title VARCHAR(255) NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'READY', assignedToUserId VARCHAR(191) NULL,
    updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX ProjectWorkOrder_org_project_idx (organizationId, projectInstallationId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await prisma.$executeRaw`INSERT INTO ProjectWorkOrder (id, organizationId, projectInstallationId, surveySessionId, title, status, assignedToUserId, updatedAt)
    VALUES ('work-order-a', 'a', 'project-a', 'survey-a', 'CI Work Order', 'CLOSED', 'admin-a', NOW(3))`;
  await prisma.$executeRawUnsafe(`CREATE TABLE ProjectCloseoutPackage (
    id VARCHAR(191) NOT NULL PRIMARY KEY, organizationId VARCHAR(191) NOT NULL,
    projectInstallationId VARCHAR(191) NOT NULL, workOrderId VARCHAR(191) NOT NULL,
    packageVersion INT NOT NULL DEFAULT 1, status VARCHAR(32) NOT NULL DEFAULT 'DRAFT'
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await prisma.$executeRaw`INSERT INTO ProjectCloseoutPackage (id, organizationId, projectInstallationId, workOrderId, packageVersion, status)
    VALUES ('closeout-a', 'a', 'project-a', 'work-order-a', 1, 'GENERATED')`;
  await prisma.$executeRawUnsafe(`CREATE TABLE ProjectActivityEvent (
    id VARCHAR(191) NOT NULL PRIMARY KEY, organizationId VARCHAR(191) NOT NULL,
    projectInstallationId VARCHAR(191) NOT NULL, surveySessionId VARCHAR(191) NULL, workOrderId VARCHAR(191) NULL,
    eventType VARCHAR(64) NOT NULL, actorUserId VARCHAR(191) NULL, summary VARCHAR(512) NOT NULL,
    detailsJson LONGTEXT NULL, occurredAt DATETIME(3) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await prisma.$executeRaw`UPDATE FieldTechnicianProfile SET status = 'ACTIVE', hourlyPayRate = 50 WHERE id = ${technician}`;
  const timeId = await repo.createTimeEntry(actor, { technicianProfileId: technician, projectInstallationId: 'project-a', workOrderId: 'work-order-a', workDate: '2030-01-01', regularHours: 8, overtimeHours: 2 });
  await repo.submitTimeEntry(actor, { timeEntryId: timeId });
  await repo.approveTimeEntry(actor, { timeEntryId: timeId });
  const approved = await prisma.$queryRaw`SELECT status, approvedByUserId, approvedAt, workOrderId FROM OperationsTimeEntry WHERE id = ${timeId}`;
  assert.equal(approved[0].status, 'APPROVED');
  assert.equal(approved[0].approvedByUserId, actor.id);
  assert.ok(approved[0].approvedAt);
  assert.equal(approved[0].workOrderId, 'work-order-a');

  const materialExpenseId = await repo.createExpense(actor, { projectInstallationId: 'project-a', workOrderId: 'work-order-a', category: 'MATERIALS', description: 'CI cable', amount: 100, expenseDate: '2030-01-01', reimbursable: false, materialQuantityPurchased: 1000, materialQuantityUsed: 750, materialUnit: 'ft' });
  const materialExpense = await prisma.$queryRaw`SELECT materialQuantityPurchased, materialQuantityUsed, materialUnit, workOrderId FROM OperationsExpense WHERE id = ${materialExpenseId}`;
  assert.equal(Number(materialExpense[0].materialQuantityPurchased), 1000);
  assert.equal(Number(materialExpense[0].materialQuantityUsed), 750);
  assert.equal(materialExpense[0].materialUnit, 'ft');
  assert.equal(materialExpense[0].workOrderId, 'work-order-a');
  await assert.rejects(() => repo.createExpense(actor, { projectInstallationId: 'project-a', category: 'MATERIALS', description: 'Invalid cable', amount: 20, expenseDate: '2030-01-01', reimbursable: false, materialQuantityPurchased: 100, materialQuantityUsed: 101, materialUnit: 'ft' }), /cannot exceed/);
  const invoiceId = await repo.createInvoice(actor, { projectInstallationId: 'project-a', workOrderId: 'work-order-a', invoiceNumber: 'CI-INV-001', customerName: 'CI Client', dueDate: '2030-01-31' });
  await repo.addInvoiceLine(actor, { invoiceId, lineType: 'LABOR', description: 'Install', quantity: 10, unitPrice: 100 });
  const draft = await prisma.$queryRaw`SELECT subtotal, totalAmount, status, workOrderId FROM OperationsInvoice WHERE id = ${invoiceId}`;
  assert.equal(Number(draft[0].subtotal), 1000);
  assert.equal(Number(draft[0].totalAmount), 1000);
  assert.equal(draft[0].status, 'DRAFT');
  assert.equal(draft[0].workOrderId, 'work-order-a');
  const adjustedTotal = await repo.updateInvoiceAdjustments(actor, { invoiceId, taxAmount: 25, discountAmount: 25 });
  assert.equal(adjustedTotal, 1000);
  const adjusted = await prisma.$queryRaw`SELECT subtotal, taxAmount, discountAmount, totalAmount FROM OperationsInvoice WHERE id = ${invoiceId}`;
  assert.equal(Number(adjusted[0].subtotal), 1000);
  assert.equal(Number(adjusted[0].taxAmount), 25);
  assert.equal(Number(adjusted[0].discountAmount), 25);
  assert.equal(Number(adjusted[0].totalAmount), 1000);
  await repo.sendInvoice(actor, { invoiceId });
  await assert.rejects(() => repo.updateInvoiceAdjustments(actor, { invoiceId, taxAmount: 50, discountAmount: 0 }), /Only draft invoices/);
  await repo.recordInvoicePayment(actor, { invoiceId, amount: 400, paidAt: '2030-01-10T12:00:00Z', method: 'ACH' });
  await assert.rejects(() => repo.recordInvoicePayment(actor, { invoiceId, amount: 700, paidAt: '2030-01-11T12:00:00Z' }), /exceeds/);
  await repo.recordInvoicePayment(actor, { invoiceId, amount: 600, paidAt: '2030-01-12T12:00:00Z', method: 'ACH' });
  const paid = await prisma.$queryRaw`SELECT totalAmount, paidAmount, status FROM OperationsInvoice WHERE id = ${invoiceId}`;
  assert.equal(Number(paid[0].paidAmount), 1000);
  assert.equal(paid[0].status, 'PAID');
  const payments = await prisma.$queryRaw`SELECT COUNT(*) AS total FROM OperationsPayment WHERE invoiceId = ${invoiceId}`;
  assert.equal(Number(payments[0].total), 2);
  const paymentEvents = await prisma.$queryRaw`SELECT eventType FROM ProjectActivityEvent WHERE workOrderId = 'work-order-a' ORDER BY occurredAt`;
  assert.deepEqual(paymentEvents.map(row => row.eventType), ['INVOICE_PAYMENT_RECORDED', 'INVOICE_PAID']);

  const workOrderScheduleId = await repo.createScheduleEntry(actor, { technicianProfileId: technician, projectInstallationId: 'project-a', workOrderId: 'work-order-a', title: 'WO assignment', startsAt: '2030-01-02T10:00:00', endsAt: '2030-01-02T11:00:00', timeZone: 'America/New_York', entryType: 'ASSIGNMENT' });
  const workOrderSchedule = await prisma.$queryRaw`SELECT workOrderId FROM OperationsScheduleEntry WHERE id = ${workOrderScheduleId}`;
  assert.equal(workOrderSchedule[0].workOrderId, 'work-order-a');
  await assert.rejects(() => repo.createInvoice(actor, { projectInstallationId: 'project-a', workOrderId: 'foreign-work-order', invoiceNumber: 'CI-INV-FOREIGN-WO', customerName: 'CI Client' }), /outside your tenant or project scope/);

  const overdueId = await repo.createInvoice(actor, { projectInstallationId: 'project-a', invoiceNumber: 'CI-INV-OVERDUE', customerName: 'Late Client', dueDate: '2020-01-01' });
  await repo.addInvoiceLine(actor, { invoiceId: overdueId, lineType: 'SERVICE', description: 'Overdue lifecycle', quantity: 1, unitPrice: 200 });
  await repo.sendInvoice(actor, { invoiceId: overdueId });
  const overdueCount = await repo.syncOverdueInvoices(actor);
  assert.equal(Number(overdueCount), 1);
  let overdue = await prisma.$queryRaw`SELECT status, paidAmount, totalAmount FROM OperationsInvoice WHERE id = ${overdueId}`;
  assert.equal(overdue[0].status, 'OVERDUE');
  await repo.recordInvoicePayment(actor, { invoiceId: overdueId, amount: 50, paidAt: '2030-01-10T12:00:00Z', method: 'ACH' });
  overdue = await prisma.$queryRaw`SELECT status, paidAmount FROM OperationsInvoice WHERE id = ${overdueId}`;
  assert.equal(overdue[0].status, 'OVERDUE');
  assert.equal(Number(overdue[0].paidAmount), 50);
  await repo.recordInvoicePayment(actor, { invoiceId: overdueId, amount: 150, paidAt: '2030-01-11T12:00:00Z', method: 'ACH' });
  overdue = await prisma.$queryRaw`SELECT status, paidAmount FROM OperationsInvoice WHERE id = ${overdueId}`;
  assert.equal(overdue[0].status, 'PAID');
  assert.equal(Number(overdue[0].paidAmount), 200);

  const payPeriod = await repo.getPayPeriodSummary(actor, { startDate: '2030-01-01', endDate: '2030-01-31' });
  assert.equal(payPeriod.rows.length, 1);
  assert.equal(payPeriod.rows[0].workOrderId, 'work-order-a');
  assert.equal(payPeriod.rows[0].regularHours, 8);
  assert.equal(payPeriod.rows[0].overtimeHours, 2);
  assert.equal(payPeriod.rows[0].hourlyRate, 50);
  assert.equal(payPeriod.rows[0].totalCost, 550);
  assert.equal(payPeriod.totals.totalCost, 550);
  const foreignPayPeriod = await repo.getPayPeriodSummary(other, { startDate: '2030-01-01', endDate: '2030-01-31' });
  assert.equal(foreignPayPeriod.rows.length, 0);
  await assert.rejects(() => repo.getPayPeriodSummary(actor, { startDate: '2030-02-01', endDate: '2030-01-01' }), /start must be on or before end/);

  const calendar = await repo.getScheduleCalendar(actor, { startLocal: '2030-01-02T00:00:00', endLocal: '2030-01-03T00:00:00', timeZone: 'America/New_York' });
  assert.equal(calendar.length, 1);
  assert.equal(calendar[0].workOrderId, 'work-order-a');
  assert.equal(calendar[0].timeZone, 'America/New_York');
  const foreignCalendar = await repo.getScheduleCalendar(other, { startLocal: '2030-01-02T00:00:00', endLocal: '2030-01-03T00:00:00', timeZone: 'America/New_York' });
  assert.equal(foreignCalendar.length, 0);
  await assert.rejects(() => repo.createScheduleEntry(actor, { ...input, timeZone: 'Not/AZone' }), /Invalid IANA time zone/);

  await prisma.$executeRaw`INSERT INTO ProjectWorkOrder (id, organizationId, projectInstallationId, surveySessionId, title, status, assignedToUserId, updatedAt)
    VALUES ('work-order-alert', 'a', 'project-a', 'survey-alert', 'Needs dispatch', 'READY', NULL, NOW(3))`;
  const result = await repo.getOperationsSnapshot(actor);
  const foreign = await repo.getOperationsSnapshot(other);
  assert.equal(result.metrics.technicianCount, 1);
  assert.ok(result.operationalAlerts.some(a => a.alertType === 'UNASSIGNED_WORK_ORDER' && a.entityId === 'work-order-alert'));
  assert.equal(result.operationalAlerts.some(a => a.entityId === 'work-order-a' && a.alertType === 'UNASSIGNED_WORK_ORDER'), false);
  assert.equal(result.metrics.upcomingAssignments, 2);
  assert.equal(result.workOrders.length, 1);
  assert.equal(result.workOrders[0].id, 'work-order-a');
  assert.equal(result.workOrders[0].projectInstallationId, 'project-a');
  assert.equal(foreign.schedule.length, 0);
  assert.equal(result.projectProfitability.find(p => p.id === 'project-a').revenue, 1200);
  assert.equal(result.projectProfitability.find(p => p.id === 'project-a').expenses, 100);
  assert.equal(result.projectProfitability.find(p => p.id === 'project-a').laborCost, 550);
  assert.equal(result.projectProfitability.find(p => p.id === 'project-a').grossProfit, 550);
  console.log('PASS MySQL 8: scheduling concurrency/tenant isolation, time approval, invoice lines, tax/discount adjustments, SENT/OVERDUE/PAID lifecycle, material purchased/used tracking, atomic payments, pay-period export boundary and project profitability.');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
