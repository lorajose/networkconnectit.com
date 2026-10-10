// Runs only against the disposable MySQL database provisioned by the CI job.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { PrismaClient } = require('@prisma/client');

const url = new URL(process.env.DATABASE_URL || 'mysql://invalid');
if (
  process.env.CI !== 'true' ||
  url.hostname !== '127.0.0.1' ||
  url.pathname !== '/operations_ci_test'
) {
  throw new Error('Requires CI=true and the disposable local operations_ci_test database.');
}

const prisma = new PrismaClient();

function load(relative, imports) {
  const source = fs.readFileSync(path.resolve(relative), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
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

function event(overrides = {}) {
  return {
    provider: 'stripe',
    providerEventId: 'evt-sub-active',
    providerSubscriptionId: 'sub-ci-1',
    providerCustomerId: 'cus-ci-1',
    eventType: 'customer.subscription.updated',
    organizationId: 'org-sub-ci',
    plan: 'PRO',
    status: 'ACTIVE',
    currentPeriodStart: new Date('2030-01-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2030-02-01T00:00:00.000Z'),
    cancelAtPeriodEnd: false,
    verifiedAt: new Date('2030-01-10T12:00:00.000Z'),
    ...overrides,
  };
}

async function main() {
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=0');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS OrganizationSubscriptionEvent');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS OrganizationSubscription');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS Organization');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=1');

  await prisma.$executeRawUnsafe(`CREATE TABLE Organization (
    id VARCHAR(191) NOT NULL PRIMARY KEY
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await prisma.$executeRawUnsafe(
    "INSERT INTO Organization (id) VALUES ('org-sub-ci')"
  );

  const migration = fs.readFileSync(
    'prisma/migrations/20261008224500_nci017_subscriptions/migration.sql',
    'utf8'
  );
  for (const sql of migration.split(';').map((s) => s.trim()).filter(Boolean)) {
    await prisma.$executeRawUnsafe(sql);
  }

  const repository = load('lib/contractor-os/subscription-repository.ts', {
    '@/lib/db': { prisma },
  });

  const active = event();
  const concurrent = await Promise.all([
    repository.applyVerifiedSubscriptionEvent(active),
    repository.applyVerifiedSubscriptionEvent(active),
  ]);
  assert.equal(
    concurrent.filter((result) => result.applied && result.reason === 'APPLIED').length,
    1,
    'exactly one concurrent delivery must apply'
  );
  assert.equal(
    concurrent.filter((result) => !result.applied && result.reason === 'DUPLICATE').length,
    1,
    'the concurrent replay must be classified as duplicate'
  );

  let row = await prisma.$queryRawUnsafe(
    "SELECT plan, status, providerSubscriptionId, verifiedAt FROM OrganizationSubscription WHERE organizationId='org-sub-ci'"
  );
  assert.equal(row.length, 1);
  assert.equal(row[0].plan, 'PRO');
  assert.equal(row[0].status, 'ACTIVE');
  assert.equal(row[0].providerSubscriptionId, 'sub-ci-1');
  assert.equal(new Date(row[0].verifiedAt).toISOString(), '2030-01-10T12:00:00.000Z');

  let events = await prisma.$queryRawUnsafe(
    "SELECT COUNT(*) AS count FROM OrganizationSubscriptionEvent WHERE organizationId='org-sub-ci'"
  );
  assert.equal(Number(events[0].count), 1, 'concurrent replay must create one audit event');

  const replay = await repository.applyVerifiedSubscriptionEvent(active);
  assert.deepEqual(replay, { applied: false, reason: 'DUPLICATE' });

  events = await prisma.$queryRawUnsafe(
    "SELECT COUNT(*) AS count FROM OrganizationSubscriptionEvent WHERE organizationId='org-sub-ci'"
  );
  assert.equal(Number(events[0].count), 1, 'later replay must not duplicate the audit event');

  const canceled = await repository.applyVerifiedSubscriptionEvent(
    event({
      providerEventId: 'evt-sub-canceled',
      eventType: 'customer.subscription.deleted',
      status: 'CANCELED',
      verifiedAt: new Date('2030-01-10T13:00:00.000Z'),
    })
  );
  assert.deepEqual(canceled, { applied: true, reason: 'APPLIED' });

  row = await prisma.$queryRawUnsafe(
    "SELECT status, verifiedAt FROM OrganizationSubscription WHERE organizationId='org-sub-ci'"
  );
  assert.equal(row[0].status, 'CANCELED');
  assert.equal(new Date(row[0].verifiedAt).toISOString(), '2030-01-10T13:00:00.000Z');

  const stale = await repository.applyVerifiedSubscriptionEvent(
    event({
      providerEventId: 'evt-sub-stale-active',
      status: 'ACTIVE',
      verifiedAt: new Date('2030-01-10T12:30:00.000Z'),
    })
  );
  assert.deepEqual(stale, { applied: false, reason: 'STALE' });

  row = await prisma.$queryRawUnsafe(
    "SELECT status, verifiedAt FROM OrganizationSubscription WHERE organizationId='org-sub-ci'"
  );
  assert.equal(row[0].status, 'CANCELED', 'older ACTIVE event must not revive canceled access');
  assert.equal(new Date(row[0].verifiedAt).toISOString(), '2030-01-10T13:00:00.000Z');

  events = await prisma.$queryRawUnsafe(
    "SELECT COUNT(*) AS count FROM OrganizationSubscriptionEvent WHERE organizationId='org-sub-ci'"
  );
  assert.equal(Number(events[0].count), 3, 'stale verified events remain in the audit trail');

  await assert.rejects(
    () =>
      repository.applyVerifiedSubscriptionEvent(
        event({
          providerEventId: 'evt-sub-wrong-identity',
          providerSubscriptionId: 'sub-ci-other',
          verifiedAt: new Date('2030-01-10T14:00:00.000Z'),
        })
      ),
    /provider identity does not match persisted state/
  );

  row = await prisma.$queryRawUnsafe(
    "SELECT status, providerSubscriptionId FROM OrganizationSubscription WHERE organizationId='org-sub-ci'"
  );
  assert.equal(row[0].status, 'CANCELED');
  assert.equal(row[0].providerSubscriptionId, 'sub-ci-1');

  console.log(
    'PASS NCI-017 subscription MySQL: concurrent webhook replay is serialized, lifecycle events persist idempotently, cancellation wins, stale events cannot revive access, and provider identity cannot be replaced.'
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
