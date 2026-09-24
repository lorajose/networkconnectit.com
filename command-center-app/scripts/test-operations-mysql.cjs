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
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', createdAt DATETIME(3) NOT NULL,
    updatedAt DATETIME(3) NOT NULL,
    UNIQUE INDEX FieldTechnicianProfile_user_key (organizationId,userId)
  ) ENGINE=InnoDB`);
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
  const result = await repo.getOperationsSnapshot(actor);
  const foreign = await repo.getOperationsSnapshot(other);
  assert.equal(result.metrics.technicianCount, 0);
  assert.equal(result.metrics.upcomingAssignments, 1);
  assert.equal(foreign.schedule.length, 0);
  console.log('PASS MySQL 8: concurrent first booking, adjacent intervals, advisory availability, PTO conflict, cancelled slots, inactive technician, viewer and tenant isolation.');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
