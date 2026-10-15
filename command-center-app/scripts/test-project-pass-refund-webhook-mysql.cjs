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
    ('project-refund', 'org-a', 'Refund Project', NOW(3))`);

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

  let nextEvent = {
    providerEventId: 'evt-refund-paid',
    providerPaymentId: 'cs-refund',
    eventType: 'checkout.session.completed',
    state: 'PAID',
    organizationId: 'org-a',
    projectInstallationId: 'project-refund',
    product: 'CCTV_DIAGRAM_EXPORT',
    amountCents: 1900,
    currency: 'USD',
    verifiedAt: new Date('2026-10-07T12:00:00.000Z'),
  };

  const provider = {
    name: 'stripe',
    async createCheckout() {
      throw new Error('not used');
    },
    async verifyWebhook() {
      return nextEvent;
    },
  };

  const request = {
    rawBody: '{"trusted":"provider-test-double"}',
    signature: 'verified-by-provider-test-double',
    headers: {},
  };

  const paid = await paymentService.processProjectPassWebhook(provider, request);
  assert.equal(paid.replayed, false);
  assert.equal(
    await repository.hasServerVerifiedProjectPass({
      organizationId: 'org-a',
      projectInstallationId: 'project-refund',
      product: 'CCTV_DIAGRAM_EXPORT',
    }),
    true,
    'verified PAID event must grant server entitlement before refund'
  );

  nextEvent = {
    ...nextEvent,
    providerEventId: 'evt-refund-full',
    eventType: 'charge.refunded',
    state: 'REFUNDED',
    verifiedAt: new Date('2026-10-07T13:00:00.000Z'),
  };

  const refunded = await paymentService.processProjectPassWebhook(provider, request);
  assert.equal(refunded.replayed, false);

  const payment = await prisma.$queryRawUnsafe(`SELECT state, verifiedAt
    FROM ProjectPassPayment WHERE provider='stripe' AND providerPaymentId='cs-refund' LIMIT 1`);
  assert.equal(payment.length, 1);
  assert.equal(payment[0].state, 'REFUNDED', 'trusted full refund must transition payment to REFUNDED');
  assert.ok(payment[0].verifiedAt);

  const entitlement = await prisma.$queryRawUnsafe(`SELECT revokedAt
    FROM ProjectPassEntitlement
    WHERE organizationId='org-a' AND projectInstallationId='project-refund'
      AND product='CCTV_DIAGRAM_EXPORT' LIMIT 1`);
  assert.equal(entitlement.length, 1);
  assert.ok(entitlement[0].revokedAt, 'trusted full refund must revoke the entitlement');

  assert.equal(
    await repository.hasServerVerifiedProjectPass({
      organizationId: 'org-a',
      projectInstallationId: 'project-refund',
      product: 'CCTV_DIAGRAM_EXPORT',
    }),
    false,
    'server access check must deny Project Pass after trusted full refund'
  );

  const events = await prisma.$queryRawUnsafe(`SELECT providerEventId, eventType
    FROM ProjectPassPaymentEvent WHERE provider='stripe' ORDER BY receivedAt ASC`);
  assert.equal(events.length, 2, 'paid and refund events must both remain in the audit trail');
  assert.deepEqual(
    new Set(events.map((event) => event.providerEventId)),
    new Set(['evt-refund-paid', 'evt-refund-full'])
  );

  console.log('PASS NCI-016 refund MySQL: verified PAID grants access, trusted REFUNDED revokes entitlement and server access denies afterward.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
