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
  const migration = fs.readFileSync('prisma/migrations/20260924210000_nci075_082_company_operations/migration.sql', 'utf8');
  for (const sql of migration.split(';').map(s => s.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(sql);
  const engines = await prisma.$queryRaw`SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'operations_ci_test'`;
  assert.ok(engines.every(row => row.ENGINE === 'InnoDB'));
  const policy = load('lib/company-operations/policy.ts', {});
  const repo = load('lib/company-operations/repository.ts', { './policy': policy, '@/lib/db': { prisma }, '@prisma/client': { Prisma } });
  const actor = { id: 'admin-a', role: 'CLIENT_ADMIN', organizationId: 'a' };
  const other = { id: 'admin-b', role: 'CLIENT_ADMIN', organizationId: 'b' };
  const technician = await repo.createTechnician(actor, { displayName: 'QA technician', workerType: 'W2', hourlyPayRate: 0 });
  const input = { technicianProfileId: technician, title: 'Concurrent booking', startsAt: '2030-01-01T10:00:00Z', endsAt: '2030-01-01T11:00:00Z', entryType: 'ASSIGNMENT' };
  // Empty schedule: locking existing bookings alone would not protect this case.
  const attempts = await Promise.allSettled([repo.createScheduleEntry(actor, input), repo.createScheduleEntry(actor, input)]);
  assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
  const rejected = attempts.find(r => r.status === 'rejected');
  assert.match(String(rejected.reason), /conflicting schedule/);
  const count = await prisma.$queryRaw`SELECT COUNT(*) AS total FROM OperationsScheduleEntry`;
  assert.equal(Number(count[0].total), 1);
  await repo.createScheduleEntry(actor, { ...input, startsAt: input.endsAt, endsAt: '2030-01-01T12:00:00Z' });
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

  await prisma.$executeRaw`UPDATE FieldTechnicianProfile SET status = 'ACTIVE', hourlyPayRate = 50 WHERE id = ${technician}`;
  const timeId = await repo.createTimeEntry(actor, { technicianProfileId: technician, projectInstallationId: 'project-a', workDate: '2030-01-01', regularHours: 8, overtimeHours: 2 });
  await repo.submitTimeEntry(actor, { timeEntryId: timeId });
  await repo.approveTimeEntry(actor, { timeEntryId: timeId });
  const approved = await prisma.$queryRaw`SELECT status, approvedByUserId, approvedAt FROM OperationsTimeEntry WHERE id = ${timeId}`;
  assert.equal(approved[0].status, 'APPROVED');
  assert.equal(approved[0].approvedByUserId, actor.id);
  assert.ok(approved[0].approvedAt);

  await repo.createExpense(actor, { projectInstallationId: 'project-a', category: 'MATERIALS', description: 'CI cable', amount: 100, expenseDate: '2030-01-01', reimbursable: false });
  const invoiceId = await repo.createInvoice(actor, { projectInstallationId: 'project-a', invoiceNumber: 'CI-INV-001', customerName: 'CI Client', totalAmount: 0, dueDate: '2030-01-31' });
  await repo.addInvoiceLine(actor, { invoiceId, lineType: 'LABOR', description: 'Install', quantity: 10, unitPrice: 100 });
  const draft = await prisma.$queryRaw`SELECT subtotal, totalAmount, status FROM OperationsInvoice WHERE id = ${invoiceId}`;
  assert.equal(Number(draft[0].subtotal), 1000);
  assert.equal(Number(draft[0].totalAmount), 1000);
  assert.equal(draft[0].status, 'DRAFT');
  await repo.sendInvoice(actor, { invoiceId });
  await repo.recordInvoicePayment(actor, { invoiceId, amount: 400, paidAt: '2030-01-10T12:00:00Z', method: 'ACH' });
  await assert.rejects(() => repo.recordInvoicePayment(actor, { invoiceId, amount: 700, paidAt: '2030-01-11T12:00:00Z' }), /exceeds/);
  await repo.recordInvoicePayment(actor, { invoiceId, amount: 600, paidAt: '2030-01-12T12:00:00Z', method: 'ACH' });
  const paid = await prisma.$queryRaw`SELECT totalAmount, paidAmount, status FROM OperationsInvoice WHERE id = ${invoiceId}`;
  assert.equal(Number(paid[0].paidAmount), 1000);
  assert.equal(paid[0].status, 'PAID');
  const payments = await prisma.$queryRaw`SELECT COUNT(*) AS total FROM OperationsPayment WHERE invoiceId = ${invoiceId}`;
  assert.equal(Number(payments[0].total), 2);

  const result = await repo.getOperationsSnapshot(actor);
  const foreign = await repo.getOperationsSnapshot(other);
  assert.equal(result.metrics.technicianCount, 1);
  assert.equal(result.metrics.upcomingAssignments, 1);
  assert.equal(foreign.schedule.length, 0);
  assert.equal(result.projectProfitability.find(p => p.id === 'project-a').revenue, 1000);
  assert.equal(result.projectProfitability.find(p => p.id === 'project-a').expenses, 100);
  assert.equal(result.projectProfitability.find(p => p.id === 'project-a').laborCost, 550);
  assert.equal(result.projectProfitability.find(p => p.id === 'project-a').grossProfit, 350);
  console.log('PASS MySQL 8: scheduling concurrency/tenant isolation, time approval, invoice lines, atomic payments and project profitability.');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
