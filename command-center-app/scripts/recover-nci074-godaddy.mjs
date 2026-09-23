import path from "node:path";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const migrationName = "20260922033500_nci074_survey_floor_plan_draft";
const prismaCliPath = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");

const migrationTablesInOrder = [
  "SurveyFloorPlanDraft",
  "SurveyFloorPlanItem",
  "SurveyMeasurement",
  "SurveyPhotoAreaLink",
  "SurveyFloorPlanApproval",
  "ProjectWorkOrder",
  "ProjectWorkOrderItem",
  "ProjectActivityEvent",
  "ProjectWorkOrderItemEvent",
  "ProjectWorkOrderEvidence",
  "FieldTechnicianProfile",
  "ProjectPunchListItem",
  "ProjectFinalAcceptance",
  "ProjectCloseoutPackage"
];

const knownPartialStates = [
  migrationTablesInOrder.slice(0, 6),
  migrationTablesInOrder.slice(0, 9)
];

const prisma = new PrismaClient();

function fail(message) {
  console.error(`NCI-074 recovery blocked: ${message}`);
  process.exitCode = 1;
}

async function tableExists(name) {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT TABLE_NAME tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1",
    name
  );
  return rows.length > 0;
}

async function rowCount(name) {
  const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS count FROM \`${name}\``);
  return Number(rows[0]?.count ?? 0);
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

try {
  const migrations = await prisma.$queryRawUnsafe(
    "SELECT finished_at finishedAt, rolled_back_at rolledBackAt FROM _prisma_migrations WHERE migration_name = ? ORDER BY started_at DESC",
    migrationName
  );

  if (migrations.some((row) => row.finishedAt && !row.rolledBackAt)) {
    console.log(`NCI-074 recovery: ${migrationName} is already successfully applied; no recovery needed.`);
    process.exitCode = 0;
  } else {
    const activeFailure = migrations.find((row) => !row.finishedAt && !row.rolledBackAt);
    if (!activeFailure) {
      fail(`no active failed migration row found for ${migrationName}`);
    } else {
      const existingTables = [];
      for (const table of migrationTablesInOrder) {
        if (await tableExists(table)) existingTables.push(table);
      }

      const matchedState = knownPartialStates.find((state) => arraysEqual(existingTables, state));
      if (!matchedState) {
        fail(`unexpected partial table state [${existingTables.join(", ")}]; refusing automatic cleanup`);
      }

      if (!process.exitCode) {
        for (const table of matchedState) {
          const count = await rowCount(table);
          if (count !== 0) {
            fail(`partial table ${table} contains ${count} row(s); refusing to drop data`);
            break;
          }
        }
      }

      if (!process.exitCode) {
        console.log(`NCI-074 recovery: verified known partial state with ${matchedState.length} zero-row tables; removing partial tables...`);
        for (const table of [...matchedState].reverse()) {
          await prisma.$executeRawUnsafe(`DROP TABLE \`${table}\``);
          console.log(`NCI-074 recovery: dropped ${table}`);
        }

        console.log(`NCI-074 recovery: marking ${migrationName} rolled back through Prisma...`);
        const result = spawnSync(
          process.execPath,
          [prismaCliPath, "migrate", "resolve", "--rolled-back", migrationName],
          { cwd: process.cwd(), env: process.env, stdio: "inherit" }
        );
        if (result.status !== 0) {
          fail(`prisma migrate resolve failed with status ${result.status ?? "unknown"}`);
        } else {
          console.log("NCI-074 recovery completed; normal migrate deploy may continue.");
        }
      }
    }
  }
} catch (error) {
  console.error("NCI-074 recovery failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
