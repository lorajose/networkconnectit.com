// Runs only against the disposable MySQL database provisioned by the CI job.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { PrismaClient } = require('@prisma/client');

const url = new URL(process.env.DATABASE_URL || 'mysql://invalid');
if (process.env.CI !== 'true' || url.hostname !== '127.0.0.1' || url.pathname !== '/operations_ci_test') {
  throw new Error('Requires CI=true and the disposable local operations_ci_test database.');
}

const prisma = new PrismaClient();

function load(relative, imports) {
  const source = fs.readFileSync(path.resolve(relative), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(
    (name) => {
      if (Object.hasOwn(imports, name)) return imports[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
    module,
    module.exports
  );
  return module.exports;
}

async function applyMigration(file) {
  const migration = fs.readFileSync(file, 'utf8');
  for (const sql of migration.split(';').map((s) => s.trim()).filter(Boolean)) {
    await prisma.$executeRawUnsafe(sql);
  }
}

function event(overrides = {}) {
  return {
    provider: 'stripe', providerEventId: 'evt-sub-active', providerSubscriptionId: 'sub-ci-1',
    providerCustomerId: 'cus-ci-1', eventType: 'customer.subscription.updated',
    organizationId: 'org-sub-ci', plan: 'PRO', status: 'ACTIVE',
    currentPeriodStart: new Date('2030-01-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2030-02-01T00:00:00.000Z'), cancelAtPeriodEnd: false,
    verifiedAt: new Date('2030-01-10T12:00:00.000Z'), ...overrides,
  };
}

async function main() {
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=0');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS OrganizationSubscriptionEvent');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS OrganizationSubscription');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS Organization');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=1');
  await prisma.$executeRawUnsafe(`CREATE TABLE Organization (id VARCHAR(191) NOT NULL PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await prisma.$executeRawUnsafe("INSERT INTO Organization (id) VALUES ('org-sub-ci')");

  await applyMigration('prisma/migrations/20261008224500_nci017_subscriptions/migration.sql');
  await applyMigration('prisma/migrations/20261010123000_nci017_scheduled_subscription_changes/migration.sql');

  const repository = load('lib/contractor-os/subscription-repository.ts', { '@/lib/db': { prisma } });
  const active = event();
  const concurrent = await Promise.all([
    repository.applyVerifiedSubscriptionEvent(active), repository.applyVerifiedSubscriptionEvent(active),
  ]);
  assert.equal(concurrent.filter((r) => r.applied && r.reason === 'APPLIED').length, 1);
  assert.equal(concurrent.filter((r) => !r.applied && r.reason === 'DUPLICATE').length, 1);

  let events = await prisma.$queryRawUnsafe("SELECT COUNT(*) AS count FROM OrganizationSubscriptionEvent WHERE organizationId='org-sub-ci'");
  assert.equal(Number(events[0].count), 1);
  assert.deepEqual(await repository.applyVerifiedSubscriptionEvent(active), { applied: false, reason: 'DUPLICATE' });

  const canceled = await repository.applyVerifiedSubscriptionEvent(event({
    providerEventId: 'evt-sub-canceled', eventType: 'customer.subscription.deleted', status: 'CANCELED',
    verifiedAt: new Date('2030-01-10T13:00:00.000Z'),
  }));
  assert.deepEqual(canceled, { applied: true, reason: 'APPLIED' });

  const stale = await repository.applyVerifiedSubscriptionEvent(event({
    providerEventId: 'evt-sub-stale-active', status: 'ACTIVE', verifiedAt: new Date('2030-01-10T12:30:00.000Z'),
  }));
  assert.deepEqual(stale, { applied: false, reason: 'STALE' });

  await assert.rejects(
    () => repository.applyVerifiedSubscriptionEvent(event({
      providerEventId: 'evt-sub-wrong-identity', providerSubscriptionId: 'sub-ci-other',
      eventType: 'customer.subscription.updated', verifiedAt: new Date('2030-01-10T14:00:00.000Z'),
    })),
    /provider identity does not match persisted state/
  );

  const replacement = await repository.applyVerifiedSubscriptionEvent(event({
    providerEventId: 'evt-sub-replacement-created', providerSubscriptionId: 'sub-ci-2',
    providerCustomerId: 'cus-ci-2', eventType: 'customer.subscription.created', plan: 'BUSINESS',
    status: 'ACTIVE', currentPeriodStart: new Date('2030-03-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2030-04-01T00:00:00.000Z'), verifiedAt: new Date('2030-03-01T00:00:01.000Z'),
  }));
  assert.deepEqual(replacement, { applied: true, reason: 'REPLACED' });

  let row = await prisma.$queryRawUnsafe("SELECT plan, status, providerSubscriptionId, providerCustomerId FROM OrganizationSubscription WHERE organizationId='org-sub-ci'");
  assert.equal(row[0].plan, 'BUSINESS');
  assert.equal(row[0].status, 'ACTIVE');
  assert.equal(row[0].providerSubscriptionId, 'sub-ci-2');
  assert.equal(row[0].providerCustomerId, 'cus-ci-2');

  await assert.rejects(
    () => repository.applyVerifiedSubscriptionEvent(event({
      providerEventId: 'evt-sub-third-identity', providerSubscriptionId: 'sub-ci-3',
      eventType: 'customer.subscription.created', verifiedAt: new Date('2030-03-01T00:00:02.000Z'),
    })),
    /provider identity does not match persisted state/
  );

  events = await prisma.$queryRawUnsafe("SELECT providerSubscriptionId, eventType FROM OrganizationSubscriptionEvent WHERE organizationId='org-sub-ci' ORDER BY receivedAt, providerEventId");
  assert.equal(events.length, 4, 'old and replacement subscription events must remain auditable');
  assert.ok(events.some((e) => e.providerSubscriptionId === 'sub-ci-1'));
  assert.ok(events.some((e) => e.providerSubscriptionId === 'sub-ci-2'));

  console.log('PASS NCI-017 subscription MySQL: current and scheduled-change migrations apply together; concurrent replay is serialized, stale events cannot revive access, identity replacement is constrained after cancellation, and prior history remains auditable.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
