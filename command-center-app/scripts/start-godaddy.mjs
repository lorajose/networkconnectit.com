import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const engineName = "libquery_engine-linux-musl-openssl-3.0.x.so.node";
const schemaEngineName = "schema-engine-linux-musl-openssl-3.0.x";
const enginePath = path.join(process.cwd(), ".next", "standalone", "prisma-engine", engineName);
const schemaEnginePath = path.join(process.cwd(), "node_modules", "@prisma", "engines", schemaEngineName);
const serverPath = path.join(process.cwd(), ".next", "standalone", "server.js");
const prismaCliPath = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const nci049RecoveryPath = path.join(process.cwd(), "scripts", "recover-nci049-godaddy.mjs");
const nci074RecoveryPath = path.join(process.cwd(), "scripts", "recover-nci074-godaddy.mjs");
const productionReleaseGatePath = path.join(process.cwd(), "scripts", "production-release-gate.mjs");

function configureDatabaseUrlFromDiscreteSecrets() {
  const rawDatabaseUrl = process.env.DATABASE_URL?.trim() ?? "";

  let pointsToLoopback = false;
  if (rawDatabaseUrl) {
    try {
      const parsed = new URL(rawDatabaseUrl);
      pointsToLoopback =
        parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    } catch {
      pointsToLoopback = false;
    }
  }

  if (rawDatabaseUrl && !pointsToLoopback) {
    return;
  }

  const host = process.env.DB_HOST?.trim();
  const port = process.env.DB_PORT?.trim() || "3306";
  const database = process.env.DB_NAME?.trim();
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD ?? "";

  if (!host || !database || !user) {
    console.error("Cannot prepare database migrations: DB_HOST, DB_NAME, or DB_USER is missing.");
    process.exit(1);
  }

  const tlsMode = (process.env.NCI_DATABASE_TLS_MODE ?? "").trim().toLowerCase();
  const tlsQuery =
    tlsMode === "verify-identity" || tlsMode === "verify-ca"
      ? "?sslaccept=strict"
      : tlsMode === "required"
        ? "?sslaccept=accept_invalid_certs"
        : "";

  process.env.DATABASE_URL =
    `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}` +
    `@${host}:${port}/${encodeURIComponent(database)}${tlsQuery}`;

  console.log(`Using DB_* secrets for startup migrations: ${host}:${port}/${database}`);
}

if (!fs.existsSync(enginePath)) {
  console.error(`Prisma runtime engine not found: ${enginePath}`);
  process.exit(1);
}

if (!fs.existsSync(schemaEnginePath)) {
  console.error(
    `Prisma schema engine not found: ${schemaEnginePath}. ` +
      "Ensure PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x is present during npm install."
  );
  process.exit(1);
}

if (!fs.existsSync(serverPath)) {
  console.error(`Next standalone server not found: ${serverPath}`);
  process.exit(1);
}

if (!fs.existsSync(prismaCliPath)) {
  console.error(`Prisma CLI not found: ${prismaCliPath}`);
  process.exit(1);
}

configureDatabaseUrlFromDiscreteSecrets();

if (process.env.NODE_ENV === "production") {
  if (!fs.existsSync(productionReleaseGatePath)) {
    console.error(`Production release gate not found: ${productionReleaseGatePath}`);
    process.exit(1);
  }
  console.log("Running Production Release Gate 1 runtime checks before migrations...");
  const gateResult = spawnSync(process.execPath, [productionReleaseGatePath], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  });
  if (gateResult.status !== 0) {
    console.error(`Production release gate failed with status ${gateResult.status ?? "unknown"}.`);
    process.exit(gateResult.status ?? 1);
  }
}

process.env.PRISMA_SCHEMA_ENGINE_BINARY = schemaEnginePath;
process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;

if (process.env.NCI_RECOVER_NCI074 === "1") {
  if (!fs.existsSync(nci074RecoveryPath)) {
    console.error(`NCI-074 recovery script not found: ${nci074RecoveryPath}`);
    process.exit(1);
  }

  console.log("NCI_RECOVER_NCI074=1: running guarded NCI-074 partial migration recovery before migrate deploy...");
  const recoveryResult = spawnSync(process.execPath, [nci074RecoveryPath], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  });

  if (recoveryResult.status !== 0) {
    console.error(`NCI-074 recovery failed with status ${recoveryResult.status ?? "unknown"}.`);
    process.exit(recoveryResult.status ?? 1);
  }
}

if (process.env.NCI_RECOVER_NCI049 === "1") {
  if (!fs.existsSync(nci049RecoveryPath)) {
    console.error(`NCI-049 recovery script not found: ${nci049RecoveryPath}`);
    process.exit(1);
  }

  console.log("NCI_RECOVER_NCI049=1: running guarded NCI-049 migration recovery before migrate deploy...");
  const recoveryResult = spawnSync(process.execPath, [nci049RecoveryPath], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  });

  if (recoveryResult.status !== 0) {
    console.error(`NCI-049 recovery failed with status ${recoveryResult.status ?? "unknown"}.`);
    process.exit(recoveryResult.status ?? 1);
  }
}

console.log(`Using Prisma schema engine: ${schemaEnginePath}`);
console.log("Applying pending Prisma migrations...");
const migrationResult = spawnSync(
  process.execPath,
  [prismaCliPath, "migrate", "deploy"],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  }
);

if (migrationResult.status !== 0) {
  console.error(`Prisma migrate deploy failed with status ${migrationResult.status ?? "unknown"}.`);
  process.exit(migrationResult.status ?? 1);
}

console.log("Prisma migrations are up to date.");

process.env.HOSTNAME = "0.0.0.0";

console.log(`Using Prisma query engine: ${enginePath}`);
console.log(`Binding Next.js standalone server to ${process.env.HOSTNAME}:${process.env.PORT ?? "3000"}`);

await import(pathToFileURL(serverPath).href);
