// Disposable MySQL integration test for NCI-011 Field Scope -> Takeoff/BOM.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { PrismaClient, Prisma } = require('@prisma/client');
const url = new URL(process.env.DATABASE_URL || 'mysql://invalid');
if (process.env.CI !== 'true' || url.hostname !== '127.0.0.1' || url.pathname !== '/operations_ci_test') throw new Error('Requires disposable CI MySQL.');
const prisma = new PrismaClient();
function load(relative, imports) {
  const source=fs.readFileSync(path.resolve(relative),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
  const module={exports:{}};
  new Function('require','module','exports',compiled)((name)=>{
    if(Object.hasOwn(imports,name)) return imports[name];
    if(name==='crypto'||name==='node:crypto') return require('node:crypto');
    throw new Error(`Unexpected dependency: ${name}`);
  },module,module.exports);
  return module.exports;
}
async function main(){
  for(const sql of [
    `CREATE TABLE TakeoffWorkspace (id VARCHAR(191) PRIMARY KEY, organizationId VARCHAR(191) NOT NULL, bidWorkspaceId VARCHAR(191), estimateId VARCHAR(191), name VARCHAR(191) NOT NULL, status VARCHAR(32) NOT NULL, notes TEXT, createdAt DATETIME(3) NOT NULL, updatedAt DATETIME(3) NOT NULL) ENGINE=InnoDB`,
    `CREATE TABLE TakeoffItem (id VARCHAR(191) PRIMARY KEY, organizationId VARCHAR(191) NOT NULL, takeoffWorkspaceId VARCHAR(191) NOT NULL, category VARCHAR(64) NOT NULL, itemCode VARCHAR(191), description TEXT NOT NULL, unit VARCHAR(64) NOT NULL, countedQuantity DECIMAL(18,3) NOT NULL, overrideQuantity DECIMAL(18,3), sheetReference VARCHAR(191), drawingRevision VARCHAR(191), notes TEXT, source VARCHAR(32) NOT NULL, createdAt DATETIME(3) NOT NULL, updatedAt DATETIME(3) NOT NULL) ENGINE=InnoDB`,
    `CREATE TABLE TakeoffBomItem (id VARCHAR(191) PRIMARY KEY, organizationId VARCHAR(191) NOT NULL, takeoffWorkspaceId VARCHAR(191) NOT NULL, takeoffItemId VARCHAR(191), catalogCode VARCHAR(191), description TEXT NOT NULL, unit VARCHAR(64) NOT NULL, generatedQuantity DECIMAL(18,3) NOT NULL, overrideQuantity DECIMAL(18,3), costRuleKey VARCHAR(191), notes TEXT, createdAt DATETIME(3) NOT NULL, updatedAt DATETIME(3) NOT NULL) ENGINE=InnoDB`
  ]) await prisma.$executeRawUnsafe(sql);
  await prisma.$executeRawUnsafe(`INSERT INTO TakeoffWorkspace VALUES ('w-a','a',NULL,NULL,'A','DRAFT',NULL,NOW(3),NOW(3)),('w-b','b',NULL,NULL,'B','DRAFT',NULL,NOW(3),NOW(3))`);
  await prisma.$executeRawUnsafe(`INSERT INTO TakeoffItem VALUES ('manual-a','a','w-a','CCTV','MAN-1','Manual camera','EA',1,NULL,NULL,NULL,'keep me','MANUAL',NOW(3),NOW(3)),('other-ai','a','w-a','CCTV','CAM-OTHER','Other handoff camera','EA',1,NULL,NULL,NULL,'Field Scope handoff FIELD-SCOPE:ss-other; keep me','AI_SUGGESTED',NOW(3),NOW(3))`);
  const access=load('lib/contractor-os/commercial-access.ts',{});
  const takeoff=load('lib/contractor-os/takeoff.ts',{'@prisma/client':{Prisma}});
  const repo=load('lib/contractor-os/field-scope-takeoff-repository.ts',{'@/lib/db':{prisma},'@prisma/client':{Prisma},'./commercial-access':access,'./takeoff':takeoff});
  const actor={id:'admin-a',role:'CLIENT_ADMIN',organizationId:'a'};
  const other={id:'admin-b',role:'CLIENT_ADMIN',organizationId:'b'};
  const handoff={handoffId:'FIELD-SCOPE:ss1',surveySessionId:'ss1',approvedBy:'estimator-a',approvedAt:'2026-10-03T20:05:00.000Z',items:[{category:'CCTV',itemCode:'CAM-001',description:'Camera',unit:'EA',countedQuantity:1,source:'AI_SUGGESTED',notes:'Field Scope handoff FIELD-SCOPE:ss1; camera'}]};
  await repo.applyApprovedFieldScopeTakeoff(actor,{organizationId:'a',workspaceId:'w-a',handoff});
  await repo.applyApprovedFieldScopeTakeoff(actor,{organizationId:'a',workspaceId:'w-a',handoff});
  const rows=await prisma.$queryRawUnsafe(`SELECT itemCode,source FROM TakeoffItem WHERE takeoffWorkspaceId='w-a' ORDER BY itemCode`);
  assert.deepEqual(rows.map(r=>[r.itemCode,r.source]),[['CAM-001','AI_SUGGESTED'],['CAM-OTHER','AI_SUGGESTED'],['MAN-1','MANUAL']]);
  // Prove replacement is atomic: force the replacement insert to fail after the prior
  // handoff rows have been selected/deleted inside the transaction, then verify rollback.
  const failingHandoff={...handoff,items:[handoff.items[0],{...handoff.items[0],description:'Duplicate item code forces rollback'}]};
  await assert.rejects(()=>repo.applyApprovedFieldScopeTakeoff(actor,{organizationId:'a',workspaceId:'w-a',handoff:failingHandoff}));
  const afterRollback=await prisma.$queryRawUnsafe(`SELECT itemCode,source FROM TakeoffItem WHERE takeoffWorkspaceId='w-a' ORDER BY itemCode`);
  assert.deepEqual(afterRollback.map(r=>[r.itemCode,r.source]),[['CAM-001','AI_SUGGESTED'],['CAM-OTHER','AI_SUGGESTED'],['MAN-1','MANUAL']]);
  const bom=await prisma.$queryRawUnsafe(`SELECT COUNT(*) total FROM TakeoffBomItem WHERE takeoffWorkspaceId='w-a'`);
  assert.equal(Number(bom[0].total),1);
  await assert.rejects(()=>repo.applyApprovedFieldScopeTakeoff(other,{organizationId:'b',workspaceId:'w-a',handoff}),/Takeoff workspace not found/);
  const foreign=await prisma.$queryRawUnsafe(`SELECT COUNT(*) total FROM TakeoffItem WHERE takeoffWorkspaceId='w-b'`);
  assert.equal(Number(foreign[0].total),0);
  console.log('PASS NCI-011 MySQL: idempotent Field Scope apply, transaction rollback, unrelated AI/manual preservation and tenant isolation.');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());
