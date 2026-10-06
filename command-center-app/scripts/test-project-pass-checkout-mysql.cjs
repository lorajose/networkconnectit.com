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
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS ProjectInstallation');
  await prisma.$executeRawUnsafe(`CREATE TABLE ProjectInstallation (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    organizationId VARCHAR(191) NOT NULL,
    name VARCHAR(191) NOT NULL,
    updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await prisma.$executeRawUnsafe(`INSERT INTO ProjectInstallation
    (id, organizationId, name, updatedAt) VALUES
    ('project-a', 'org-a', 'Tenant A Project', NOW(3)),
    ('project-b', 'org-b', 'Tenant B Project', NOW(3))`);

  const commercialAccess = load('lib/contractor-os/commercial-access.ts', {});
  const projectPass = load('lib/contractor-os/project-pass.ts', {});
  const catalog = load('lib/contractor-os/project-pass-catalog.ts', {
    './project-pass': projectPass,
  });
  const checkoutPolicy = load('lib/contractor-os/project-pass-checkout-policy.ts', {
    './project-pass-catalog': catalog,
  });

  let providerCalls = 0;
  const provider = {
    name: 'ci-provider',
    async createCheckout(request) {
      providerCalls += 1;
      return {
        provider: 'ci-provider',
        providerPaymentId: 'checkout-ci',
        checkoutUrl: 'https://payments.example/checkout-ci',
        request,
      };
    },
    async verifyWebhook() {
      throw new Error('not used');
    },
  };

  const paymentService = load('lib/contractor-os/project-pass-payment-service.ts', {
    '@prisma/client': { Prisma },
    '@/lib/db': { prisma },
    './commercial-access': commercialAccess,
    './project-pass-checkout-policy': checkoutPolicy,
    './project-pass-repository': {
      applyVerifiedProjectPassEvent() {
        throw new Error('not used');
      },
    },
    './project-pass-provider': {
      toVerifiedProjectPassEvent() {
        throw new Error('not used');
      },
    },
  });

  const previousNodeEnv = process.env.NODE_ENV;
  const previousNextAuthUrl = process.env.NEXTAUTH_URL;
  process.env.NODE_ENV = 'production';
  process.env.NEXTAUTH_URL = 'https://app.networkconnectit.com';

  try {
    await assert.rejects(
      () =>
        paymentService.createProjectPassCheckout(provider, {
          organizationId: 'org-a',
          projectInstallationId: 'project-b',
          product: 'CCTV_DIAGRAM_EXPORT',
          successUrl: 'https://app.networkconnectit.com/project-pass/success',
          cancelUrl: 'https://app.networkconnectit.com/project-pass/cancel',
        }),
      /outside your tenant|not found/i
    );
    assert.equal(providerCalls, 0, 'cross-tenant project must never reach payment provider');

    const session = await paymentService.createProjectPassCheckout(provider, {
      organizationId: 'org-a',
      projectInstallationId: 'project-a',
      product: 'CCTV_DIAGRAM_EXPORT',
      successUrl: 'https://app.networkconnectit.com/project-pass/success',
      cancelUrl: 'https://app.networkconnectit.com/project-pass/cancel',
    });

    assert.equal(providerCalls, 1);
    assert.equal(session.request.amountCents, 1900);
    assert.equal(session.request.currency, 'USD');
    assert.equal(session.request.organizationId, 'org-a');
    assert.equal(session.request.projectInstallationId, 'project-a');
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousNextAuthUrl === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = previousNextAuthUrl;
  }

  console.log('PASS NCI-016 checkout MySQL: cross-tenant project is rejected before provider invocation and valid checkout uses server catalog terms.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
