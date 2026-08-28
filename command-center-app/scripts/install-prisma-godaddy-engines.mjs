import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const target = "linux-musl-openssl-3.0.x";
const enginesPostinstall = path.join(
  process.cwd(),
  "node_modules",
  "@prisma",
  "engines",
  "scripts",
  "postinstall.js"
);
const schemaEngine = path.join(
  process.cwd(),
  "node_modules",
  "@prisma",
  "engines",
  `schema-engine-${target}`
);

if (!fs.existsSync(enginesPostinstall)) {
  console.error(`Prisma engines postinstall script not found: ${enginesPostinstall}`);
  process.exit(1);
}

console.log(`Ensuring Prisma CLI engines for ${target} are installed...`);
const result = spawnSync(process.execPath, [enginesPostinstall], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PRISMA_CLI_BINARY_TARGETS: target
  },
  stdio: "inherit"
});

if (result.status !== 0) {
  console.error(`Prisma engines download failed with status ${result.status ?? "unknown"}.`);
  process.exit(result.status ?? 1);
}

if (!fs.existsSync(schemaEngine)) {
  console.error(`Prisma schema engine was not downloaded: ${schemaEngine}`);
  process.exit(1);
}

console.log(`Prisma schema engine ready: ${schemaEngine}`);
