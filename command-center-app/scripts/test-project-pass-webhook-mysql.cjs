// Runs only against the disposable MySQL database provisioned by the CI job.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { PrismaClient, Prisma } = require('@prisma/client');

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

async function main() {
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=0');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS ProjectPassPaymentEvent');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS ProjectPassEntitlement');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS ProjectPassPayment');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS ProjectInstallation');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=1');

  await prisma.$executeRawUnsafe(`CREATE TABLE ProjectInstallation (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    organizationId VARCHAR(191) NOT NULL,
    name VARCHAR(191) NOT NULL,
    updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await prisma.$executeRawUnsafe(`CREATE TABLE ProjectPassPayment (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    organizationId VARCHAR(191) NOT NULL,
    projectInstallationId VARCHAR(191) NOT NULL,
    product VARCHAR(64) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    providerPaymentId VARCHAR(191) NOT NULL,
    state VARCHAR(32) NOT NULL,
    amountCents INT NOT NULL,
    currency VARCHAR(3) NOT NULL,
    verifiedAt DATETIME(3) NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_provider_payment (provider, providerPaymentId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await prisma.$executeRawUnsafe(`CREATE TABLE ProjectPassPaymentEvent (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    organizationId VARCHAR(191) NOT NULL,
    projectInstallationId VARCHAR(191) NOT NULL,
    paymentId VARCHAR(191) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    providerEventId VARCHAR(191) NOT NULL,
    eventType VARCHAR(191) NOT NULL,
    verified BOOLEAN NOT NULL,
    receivedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_provider_event (provider, providerEventId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await prisma.$executeRawUnsafe(`CREATE TABLE ProjectPassEntitlement (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    organizationId VARCHAR(191) NOT NULL,
    projectInstallationId VARCHAR(191) NOT NULL,
    product VARCHAR(64) NOT NULL,
    paymentId VARCHAR(191) NOT NULL,
    grantedAt DATETIME(3) NOT NULL,
    revokedAt DATETIME(3) NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_entitlement (organizationId, projectInstallationId, product)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await prisma.$executeRawUnsafe(`INSERT INTO ProjectInstallation
    (id, organizationId, name, updatedAt) VALUES
    ('project-a', 'org-a', 'Tenant A Project', NOW(3))`);

  const commercialAccess = load('lib/contractor-os/commercial-access.ts', {});
  const projectPass = load('lib/contractor-os/project-pass.ts', {});
  const repository = load('lib/contractor-os/project-pass-repository.ts', {
    'node:crypto': require('node:crypto'),
    '@prisma/client': { Prisma },
    '@/lib/db': { prisma },
    './commercial-access': commercialAccess,
    './project-pass': projectPass,
  });
  const providerContract = load('lib/contractor-os/project-pass-provider.ts', {});
  const paymentService = load('lib/contractor-os/project-pass-payment-service.ts', {
    '@prisma/client': { Prisma },
    '@/lib/db': { prisma },
    './commercial-access': commercialAccess,
    './project-pass-checkout-policy': {},
    './project-pass-repository': repository,
    './project-pass-provider': providerContract,
  });

  let verifyCalls = 0;
  const provider = {
    name: 'stripe',
    async createCheckout() {
      throw new Error('not used');
    },
    async verifyWebhook() {
      verifyCalls += 1;
      return {
        providerEventId: 'evt-ci-paid',
        providerPaymentId: 'cs-ci-paid',
        eventType: 'checkout.session.completed',
        state: 'PAID',
        organizationId: 'org-a',
        projectInstallationId: 'project-a',
        product: 'CCTV_DIAGRAM_EXPORT',
        amountCents: 1900,
        currency: 'USD',
        verifiedAt: new Date('2026-10-07T12:00:00.000Z'),
      };
    },
  };

  const result = await paymentService.processProjectPassWebhook(provider, {
    rawBody: '{"trusted":"provider-test-double"}',
    signature: 'verified-by-provider-test-double',
    headers: {},
  });

  assert.equal(verifyCalls, 1, 'provider authenticity boundary must run exactly once');
  assert.equal(result.replayed, false);

  const payment = await prisma.$queryRawUnsafe(`SELECT state, amountCents, currency, verifiedAt
    FROM ProjectPassPayment WHERE provider='stripe' AND providerPaymentId='cs-ci-paid' LIMIT 1`);
  assert.equal(payment.length, 1);
  assert.equal(payment[0].state, 'PAID');
  assert.equal(payment[0].amountCents, 1900);
  assert.equal(payment[0].currency, 'USD');
  assert.ok(payment[0].verifiedAt);

  const entitlement = await prisma.$queryRawUnsafe(`SELECT revokedAt
    FROM ProjectPassEntitlement
    WHERE organizationId='org-a' AND projectInstallationId='project-a'
      AND product='CCTV_DIAGRAM_EXPORT' LIMIT 1`);
  assert.equal(entitlement.length, 1, 'verified PAID webhook must grant entitlement');
  assert.equal(entitlement[0].revokedAt, null);

  assert.equal(
    await repository.hasServerVerifiedProjectPass({
      organizationId: 'org-a',
      projectInstallationId: 'project-a',
      product: 'CCTV_DIAGRAM_EXPORT',
    }),
    true,
    'server access check must authorize the persisted verified entitlement'
  );

  const replay = await paymentService.processProjectPassWebhook(provider, {
    rawBody: '{"trusted":"provider-test-double"}',
    signature: 'verified-by-provider-test-double',
    headers: {},
  });
  assert.equal(replay.replayed, true, 'provider event replay must be idempotent');

  const events = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS count
    FROM ProjectPassPaymentEvent WHERE provider='stripe' AND providerEventId='evt-ci-paid'`);
  assert.equal(Number(events[0].count), 1, 'replay must not duplicate payment-event audit rows');

  console.log('PASS NCI-016 webhook MySQL: verified provider event persists PAID payment, grants server entitlement, authorizes access and replays idempotently.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
