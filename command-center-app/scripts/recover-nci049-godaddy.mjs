import mysql from "mysql2/promise";
import { spawnSync } from "node:child_process";
import path from "node:path";

const migrationName = "20260828102000_nci049_design_studio_foundation";
const prismaCliPath = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");

function configureDatabaseUrl() {
  const host = process.env.DB_HOST?.trim();
  const port = process.env.DB_PORT?.trim() || "3306";
  const database = process.env.DB_NAME?.trim();
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD ?? "";

  if (!host || !database || !user) {
    throw new Error("DB_HOST, DB_NAME, and DB_USER are required for NCI-049 recovery.");
  }

  process.env.DATABASE_URL =
    `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}` +
    `@${host}:${port}/${encodeURIComponent(database)}`;

  return { host, port: Number(port), database, user, password };
}

const config = configureDatabaseUrl();
console.log(`NCI-049 recovery target: ${config.host}:${config.port}/${config.database}`);

const connection = await mysql.createConnection(config);
try {
  const [migrationRows] = await connection.execute(
    "SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations WHERE migration_name = ?",
    [migrationName]
  );

  if (migrationRows.length !== 1) {
    throw new Error(`Expected exactly one ${migrationName} migration record; found ${migrationRows.length}.`);
  }

  const migration = migrationRows[0];
  if (migration.finished_at || migration.rolled_back_at) {
    throw new Error("NCI-049 is not an unresolved failed migration; refusing recovery.");
  }

  const [tables] = await connection.execute(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME LIKE 'Design%' OR TABLE_NAME LIKE 'DeviceCatalog%') ORDER BY TABLE_NAME"
  );
  const names = tables.map((row) => row.TABLE_NAME);
  const allowed = names.length === 1 && names[0] === "DesignProject";
  if (!allowed) {
    throw new Error(`Unexpected partial NCI-049 tables: ${names.join(", ") || "none"}. Refusing recovery.`);
  }

  const [[countRow]] = await connection.query("SELECT COUNT(*) AS rowCount FROM `DesignProject`");
  if (Number(countRow.rowCount) !== 0) {
    throw new Error(`DesignProject contains ${countRow.rowCount} rows; refusing destructive recovery.`);
  }

  console.log("Verified failed migration and empty partial DesignProject table. Dropping only DesignProject...");
  await connection.query("DROP TABLE `DesignProject`");
} finally {
  await connection.end();
}

console.log(`Marking ${migrationName} rolled back through Prisma...`);
const resolveResult = spawnSync(
  process.execPath,
  [prismaCliPath, "migrate", "resolve", "--rolled-back", migrationName],
  { cwd: process.cwd(), env: process.env, stdio: "inherit" }
);

if (resolveResult.status !== 0) {
  throw new Error(`prisma migrate resolve failed with status ${resolveResult.status ?? "unknown"}.`);
}

console.log("NCI-049 recovery completed. The normal startup migration deploy can now retry the corrected migration.");
