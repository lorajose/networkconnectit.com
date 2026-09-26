import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const engineName = "libquery_engine-linux-musl-openssl-3.0.x.so.node";
const enginePath = path.join(process.cwd(), ".next", "standalone", "prisma-engine", engineName);
const serverPath = path.join(process.cwd(), ".next", "standalone", "server.js");
const gatePath = path.join(process.cwd(), "scripts", "qa-runtime-gate.mjs");

for (const required of [enginePath, serverPath, gatePath]) {
  if (!fs.existsSync(required)) {
    console.error(`QA runtime prerequisite not found: ${required}`);
    process.exit(1);
  }
}

console.log("Running isolated QA runtime gate. No migrations will be applied by this startup.");
const gate = spawnSync(process.execPath, [gatePath], { cwd: process.cwd(), env: process.env, stdio: "inherit" });
if (gate.status !== 0) process.exit(gate.status ?? 1);

process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
process.env.HOSTNAME = "0.0.0.0";
console.log("QA runtime gate passed. Starting standalone server without prisma migrate deploy.");
await import(pathToFileURL(serverPath).href);
