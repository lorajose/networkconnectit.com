// Runs only against the disposable MySQL database provisioned by the CI job.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { PrismaClient } = require('@prisma/client');
const url = new URL(process.env.DATABASE_URL || 'mysql://invalid');
if (process.env.CI !== 'true' || url.hostname !== '127.0.0.1' || url.pathname !== '/operations_ci_test') throw new Error('Requires CI=true and the disposable local operations_ci_test database.');
const prisma = new PrismaClient();
function load(relative, imports) { const source = fs.readFileSync(path.resolve(relative), 'utf8'); const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText; const module = { exports: {} }; new Function('require','module','exports',compiled)((name) => { if (Object.hasOwn(imports,name)) return imports[name]; throw new Error(`Unexpected dependency: ${name}`); }, module, module.exports); return module.exports; }
async function applyMigration(file) { const migration = fs.readFileSync(file,'utf8'); for (const sql of migration.split(';').map((s)=>s.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(sql); }
function event(overrides={}) { return { provider:'stripe', providerEventId:'evt-sub-active', providerSubscriptionId:'sub-ci-1', providerCustomerId:'cus-ci-1', eventType:'customer.subscription.updated', organizationId:'org-sub-ci', plan:'PRO', status:'ACTIVE', currentPeriodStart:new Date('2030-01-01T00:00:00.000Z'), currentPeriodEnd:new Date('2030-02-01T00:00:00.000Z'), cancelAtPeriodEnd:false, verifiedAt:new Date('2030-01-10T12:00:00.000Z'), ...overrides }; }
async function main() {
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=0');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS OrganizationSubscriptionEvent'); await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS OrganizationSubscription'); await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS Organization');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=1');
  await prisma.$executeRawUnsafe(`CREATE TABLE Organization (id VARCHAR(191) NOT NULL PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await prisma.$executeRawUnsafe("INSERT INTO Organization (id) VALUES ('org-sub-ci')");
  await applyMigration('prisma/migrations/20261008224500_nci017_subscriptions/migration.sql'); await applyMigration('prisma/migrations/20261010123000_nci017_scheduled_subscription_changes/migration.sql');
  const repository = load('lib/contractor-os/subscription-repository.ts', { '@/lib/db': { prisma } });
  const active = event();
  const concurrent = await Promise.all([repository.applyVerifiedSubscriptionEvent(active), repository.applyVerifiedSubscriptionEvent(active)]);
  assert.equal(concurrent.filter((r)=>r.applied&&r.reason==='APPLIED').length,1); assert.equal(concurrent.filter((r)=>!r.applied&&r.reason==='DUPLICATE').length,1);
  assert.deepEqual(await repository.applyVerifiedSubscriptionEvent(active), { applied:false, reason:'DUPLICATE' });
  const canceled = await repository.applyVerifiedSubscriptionEvent(event({ providerEventId:'evt-sub-canceled', eventType:'customer.subscription.deleted', status:'CANCELED', verifiedAt:new Date('2030-01-10T13:00:00.000Z') }));
  assert.deepEqual(canceled,{applied:true,reason:'APPLIED'});
  const stale = await repository.applyVerifiedSubscriptionEvent(event({ providerEventId:'evt-sub-stale-active', status:'ACTIVE', verifiedAt:new Date('2030-01-10T12:30:00.000Z') })); assert.deepEqual(stale,{applied:false,reason:'STALE'});

  await assert.rejects(() => repository.applyVerifiedSubscriptionEvent(event({ providerEventId:'evt-replacement-wrong-customer', providerSubscriptionId:'sub-ci-2', providerCustomerId:'cus-attacker', eventType:'customer.subscription.created', plan:'BUSINESS', verifiedAt:new Date('2030-03-01T00:00:01.000Z') })), /customer does not match persisted state/);
  await assert.rejects(() => repository.applyVerifiedSubscriptionEvent(event({ providerEventId:'evt-replacement-stale', providerSubscriptionId:'sub-ci-2', providerCustomerId:'cus-ci-1', eventType:'customer.subscription.created', plan:'BUSINESS', verifiedAt:new Date('2030-01-10T12:59:59.000Z') })), /older than persisted cancellation/);

  const replacement = await repository.applyVerifiedSubscriptionEvent(event({ providerEventId:'evt-sub-replacement-created', providerSubscriptionId:'sub-ci-2', providerCustomerId:'cus-ci-1', eventType:'customer.subscription.created', plan:'BUSINESS', status:'ACTIVE', currentPeriodStart:new Date('2030-03-01T00:00:00.000Z'), currentPeriodEnd:new Date('2030-04-01T00:00:00.000Z'), verifiedAt:new Date('2030-03-01T00:00:01.000Z') }));
  assert.deepEqual(replacement,{applied:true,reason:'REPLACED'});
  let row = await prisma.$queryRawUnsafe("SELECT plan,status,providerSubscriptionId,providerCustomerId FROM OrganizationSubscription WHERE organizationId='org-sub-ci'");
  assert.equal(row[0].plan,'BUSINESS'); assert.equal(row[0].providerSubscriptionId,'sub-ci-2'); assert.equal(row[0].providerCustomerId,'cus-ci-1');

  await prisma.$executeRawUnsafe("UPDATE OrganizationSubscription SET pendingPlan='PRO', providerScheduleId='sub_sched_ci', pendingPlanEffectiveAt='2030-04-01 00:00:00.000' WHERE organizationId='org-sub-ci'");
  await repository.applyVerifiedSubscriptionEvent(event({ providerEventId:'evt-business-before-transition', providerSubscriptionId:'sub-ci-2', providerCustomerId:'cus-ci-1', eventType:'customer.subscription.updated', plan:'BUSINESS', status:'ACTIVE', verifiedAt:new Date('2030-03-15T00:00:00.000Z') }));
  row = await prisma.$queryRawUnsafe("SELECT plan,pendingPlan,providerScheduleId FROM OrganizationSubscription WHERE organizationId='org-sub-ci'");
  assert.equal(row[0].plan,'BUSINESS'); assert.equal(row[0].pendingPlan,'PRO'); assert.equal(row[0].providerScheduleId,'sub_sched_ci');
  await repository.applyVerifiedSubscriptionEvent(event({ providerEventId:'evt-pro-transition', providerSubscriptionId:'sub-ci-2', providerCustomerId:'cus-ci-1', eventType:'customer.subscription.updated', plan:'PRO', status:'ACTIVE', verifiedAt:new Date('2030-04-01T00:00:01.000Z') }));
  row = await prisma.$queryRawUnsafe("SELECT plan,pendingPlan,providerScheduleId,pendingPlanEffectiveAt FROM OrganizationSubscription WHERE organizationId='org-sub-ci'");
  assert.equal(row[0].plan,'PRO'); assert.equal(row[0].pendingPlan,null); assert.equal(row[0].providerScheduleId,null); assert.equal(row[0].pendingPlanEffectiveAt,null);

  const events = await prisma.$queryRawUnsafe("SELECT providerSubscriptionId FROM OrganizationSubscriptionEvent WHERE organizationId='org-sub-ci'");
  assert.ok(events.some((e)=>e.providerSubscriptionId==='sub-ci-1')); assert.ok(events.some((e)=>e.providerSubscriptionId==='sub-ci-2'));
  console.log('PASS NCI-017 subscription MySQL: replay serialization, stale protection, customer-bound replacement, scheduled-plan transition clearing, and audit history verified.');
}
main().catch((error)=>{console.error(error);process.exitCode=1;}).finally(async()=>{await prisma.$disconnect();});
