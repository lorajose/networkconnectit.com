import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const base={...process.env,NCI_RUNTIME_ENV:"qa",NODE_ENV:"production",NEXTAUTH_URL:"https://qa-command.networkconnectit.net/api/auth",NEXTAUTH_SECRET:"ci-qa-auth-key-8f4c2a7d91b6e3050000",DATABASE_URL:"mysql://ci:ci@qa-db.internal:3306/command_center_qa",DESIGN_STORAGE_DRIVER:"filesystem",DESIGN_PRIVATE_STORAGE_ROOT:"/srv/nci-qa-private",DATABASE_ADMIN_URL:"",FIRST_ADMIN_BOOTSTRAP_TOKEN:"",NCI_ALLOW_DEMO_SEED:"false"};
const gate=(o={})=>spawnSync(process.execPath,["scripts/qa-runtime-gate.mjs"],{cwd:process.cwd(),env:{...base,...o},encoding:"utf8"});
const valid=gate(); assert.equal(valid.status,0,valid.stderr);
for(const [overrides,pattern] of [
 [{NEXTAUTH_URL:"https://command.networkconnectit.com/api/auth"},/must not use production host/],
 [{NCI_RUNTIME_ENV:"production"},/must be qa/],
 [{DATABASE_URL:"mysql://ci:ci@db.internal:3306/command_center"},/must visibly identify/],
 [{DESIGN_PRIVATE_STORAGE_ROOT:"/srv/nci-private"},/must visibly identify/],
 [{NCI_RECOVER_NCI074:"1"},/must be disabled/],
 [{DATABASE_ADMIN_URL:"mysql://admin:admin@qa-db.internal:3306/command_center_qa"},/must not be configured/],
 [{NCI_QA_ALLOW_MIGRATIONS:"1"},/run QA migrations separately/]
]) { const r=gate(overrides); assert.notEqual(r.status,0); assert.match(r.stderr,pattern); }
console.log("PASS QA runtime gate: production isolation, database/storage identity and no automatic migrations.");
