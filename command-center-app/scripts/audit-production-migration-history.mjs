import { PrismaClient } from "@prisma/client";

const watchedMigrations = [
  "20260925010000_nci079_material_usage"
];

const prisma = new PrismaClient();

function fail(message) {
  console.error(`Migration history audit blocked: ${message}`);
  process.exitCode = 1;
}

try {
  const tableRows = await prisma.$queryRawUnsafe(
    "SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_prisma_migrations'"
  );
  if (Number(tableRows[0]?.count ?? 0) !== 1) {
    fail("_prisma_migrations table is missing");
  } else {
    for (const migrationName of watchedMigrations) {
      const rows = await prisma.$queryRawUnsafe(
        "SELECT migration_name migrationName, checksum, started_at startedAt, finished_at finishedAt, rolled_back_at rolledBackAt, applied_steps_count appliedStepsCount FROM _prisma_migrations WHERE migration_name = ? ORDER BY started_at DESC",
        migrationName
      );

      if (rows.length === 0) {
        console.log(`Migration history audit: ${migrationName} has not been recorded in this database.`);
        continue;
      }

      for (const row of rows) {
        const state = row.rolledBackAt
          ? "rolled-back"
          : row.finishedAt
            ? "applied"
            : "incomplete";
        console.log(
          `Migration history audit: ${row.migrationName} state=${state} appliedSteps=${Number(row.appliedStepsCount ?? 0)} checksum=${row.checksum}`
        );
      }

      if (rows.some((row) => !row.finishedAt && !row.rolledBackAt)) {
        fail(`${migrationName} has an incomplete active migration record`);
      }
    }
  }
} catch (error) {
  console.error("Migration history audit failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
