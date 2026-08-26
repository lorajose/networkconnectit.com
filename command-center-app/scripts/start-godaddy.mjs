import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const engineName = "libquery_engine-linux-musl-openssl-3.0.x.so.node";
const enginePath = path.join(process.cwd(), ".next", "standalone", "prisma-engine", engineName);
const serverPath = path.join(process.cwd(), ".next", "standalone", "server.js");

if (!fs.existsSync(enginePath)) {
  console.error(`Prisma runtime engine not found: ${enginePath}`);
  process.exit(1);
}

if (!fs.existsSync(serverPath)) {
  console.error(`Next standalone server not found: ${serverPath}`);
  process.exit(1);
}

process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
console.log(`Using Prisma query engine: ${enginePath}`);

await import(pathToFileURL(serverPath).href);
