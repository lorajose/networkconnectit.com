// Runs after test-operations-mysql.cjs against the same disposable CI database.
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
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)((name) => {
    if (Object.hasOwn(imports, name)) return imports[name];
    if (name === 'crypto' || name === 'node:crypto') return require('node:crypto');
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  return module.exports;
}

async function main() {
  const commercialAccess = load('lib/contractor-os/commercial-access.ts', {});
  const projectPass = load('lib/contractor-os/project-pass.ts', {});
  const repo = load('lib/contractor-os/project-pass-repository.ts', {
    '@/lib/db': { prisma },
    '@prisma/client': { Prisma },
    './commercial-access': commercialAccess,
    './project-pass': projectPass,
  });

  const before = await prisma.$queryRawUnsafe(
    "SELECT e.paymentId, e.revokedAt, p.providerPaymentId, p.state FROM ProjectPassEntitlement e JOIN ProjectPassPayment p ON p.id=e.paymentId WHERE e.organizationId='a' AND e.projectInstallationId='project-a' AND e.product='CCTV_DIAGRAM_EXPORT'",
  );
  assert.equal(before.length, 1);
  assert.equal(before[0].providerPaymentId, 'pay-2');
  assert.equal(before[0].state, 'PAID');
  assert.equal(before[0].revokedAt, null);

  const lateRefund = await repo.applyVerifiedProjectPassEvent({
    organizationId: 'a',
    projectInstallationId: 'project-a',
    product: 'CCTV_DIAGRAM_EXPORT',
    provider: 'ci-provider',
    providerEventId: 'evt-late-refund-pay-1',
    providerPaymentId: 'pay-1',
    eventType: 'payment.refunded',
    state: 'REFUNDED',
    amountCents: 4900,
    currency: 'usd',
    verifiedAt: new Date('2030-01-07T12:00:00Z'),
  });
  assert.equal(lateRefund.replayed, false);

  assert.equal(await repo.hasServerVerifiedProjectPass({
    organizationId: 'a',
    projectInstallationId: 'project-a',
    product: 'CCTV_DIAGRAM_EXPORT',
  }), true);

  const after = await prisma.$queryRawUnsafe(
    "SELECT e.paymentId, e.revokedAt, p.providerPaymentId, p.state FROM ProjectPassEntitlement e JOIN ProjectPassPayment p ON p.id=e.paymentId WHERE e.organizationId='a' AND e.projectInstallationId='project-a' AND e.product='CCTV_DIAGRAM_EXPORT'",
  );
  assert.equal(after.length, 1);
  assert.equal(after[0].providerPaymentId, 'pay-2');
  assert.equal(after[0].state, 'PAID');
  assert.equal(after[0].revokedAt, null);

  const oldPayment = await prisma.$queryRawUnsafe(
    "SELECT state, verifiedAt FROM ProjectPassPayment WHERE provider='ci-provider' AND providerPaymentId='pay-1'",
  );
  assert.equal(oldPayment[0].state, 'REFUNDED');
  assert.equal(new Date(oldPayment[0].verifiedAt).toISOString(), '2030-01-07T12:00:00.000Z');

  console.log('PASS NCI-016 late refund: an older refunded payment cannot revoke the active entitlement from a newer repurchase.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
