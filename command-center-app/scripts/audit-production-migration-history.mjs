import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function fail(message) {
  console.error(`Migration history audit blocked: ${message}`);
  process.exitCode = 1;
}

function localMigrationNames() {
  return readdirSync(resolve(process.cwd(), "prisma", "migrations"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => /^\d{14}_.+/.test(name))
    .sort();
}

function localChecksum(migrationName) {
  const sql = readFileSync(
    resolve(process.cwd(), "prisma", "migrations", migrationName, "migration.sql")
  );
  return createHash("sha256").update(sql).digest("hex");
}

try {
  const tableRows = await prisma.$queryRawUnsafe(
    "SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_prisma_migrations'"
  );

  if (Number(tableRows[0]?.count ?? 0) !== 1) {
    fail("_prisma_migrations table is missing");
  } else {
    const localMigrations = localMigrationNames();
    const localSet = new Set(localMigrations);
    const rows = await prisma.$queryRawUnsafe(
      "SELECT migration_name migrationName, checksum, started_at startedAt, finished_at finishedAt, rolled_back_at rolledBackAt, applied_steps_count appliedStepsCount FROM _prisma_migrations ORDER BY started_at ASC"
    );

    const rowsByName = new Map();
    for (const row of rows) {
      const list = rowsByName.get(row.migrationName) ?? [];
      list.push(row);
      rowsByName.set(row.migrationName, list);

      const state = row.rolledBackAt
        ? "rolled-back"
        : row.finishedAt
          ? "applied"
          : "incomplete";
      console.log(
        `Migration history audit: ${row.migrationName} state=${state} appliedSteps=${Number(row.appliedStepsCount ?? 0)} checksum=${row.checksum}`
      );

      if (!localSet.has(row.migrationName)) {
        fail(`database contains migration ${row.migrationName} that is absent from this release`);
      }
      if (!row.finishedAt && !row.rolledBackAt) {
        fail(`${row.migrationName} has an incomplete active migration record`);
      }
    }

    for (const migrationName of localMigrations) {
      const expectedChecksum = localChecksum(migrationName);
      const migrationRows = rowsByName.get(migrationName) ?? [];
      const appliedRows = migrationRows.filter((row) => row.finishedAt && !row.rolledBackAt);

      if (appliedRows.length === 0) {
        console.log(`Migration history audit: ${migrationName} is pending for this database.`);
        continue;
      }

      if (appliedRows.length > 1) {
        fail(`${migrationName} has more than one active applied record`);
      }

      if (appliedRows.some((row) => row.checksum !== expectedChecksum)) {
        fail(`${migrationName} checksum differs from the migration.sql currently in this release`);
      }
    }
  }
} catch (error) {
  console.error(
    "Migration history audit failed:",
    error instanceof Error ? error.message : String(error)
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
