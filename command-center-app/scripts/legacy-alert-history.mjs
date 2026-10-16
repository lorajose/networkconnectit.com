// Read-only recognition of a manually resolved legacy migration whose SQL was lost.
// Never recreate migration.sql or alter _prisma_migrations to fabricate a checksum.
export const legacyAlertMigration = "20260921013000_alert_schema_alignment";
const appliedChecksum = "5d918c8d103f57d8ace81ed27c4ddb9c2d3a81b90c92eb9ad74747fbecbd5238";
const rolledBackChecksum = "d96af6c6cc4b86b734a8ea509020113550ea9ce85e639c9cc12d4cd8e15a0919";

export function verifyLegacyAlertHistory(rows) {
  if (rows.length !== 2) throw new Error("Legacy Alert history must contain exactly the two reviewed records");
  const applied = rows.find((r) => r.id === "e41dbfa7-aa98-4f41-9dc7-f362c3ae6e7d");
  const rolledBack = rows.find((r) => r.id === "9788262a-4208-4239-9c77-46bf1a615753");
  if (!applied || !rolledBack || rows.some((r) => r.migrationName !== legacyAlertMigration) ||
      applied.checksum !== appliedChecksum || !applied.finishedAt || applied.rolledBackAt ||
      Number(applied.appliedStepsCount) !== 0 || rolledBack.checksum !== rolledBackChecksum ||
      rolledBack.finishedAt || !rolledBack.rolledBackAt || Number(rolledBack.appliedStepsCount) !== 0) {
    throw new Error("Legacy Alert migration records differ from the reviewed export");
  }
}

export const alertColumns = {
  id: ["varchar(191)", "NO"], organizationId: ["varchar(191)", "NO"],
  siteId: ["varchar(191)", "YES"], deviceId: ["varchar(191)", "YES"],
  title: ["varchar(191)", "NO"], message: ["text", "YES"],
  severity: ["enum('LOW','MEDIUM','HIGH','CRITICAL')", "NO"],
  status: ["enum('OPEN','ACKNOWLEDGED','RESOLVED')", "NO"],
  detectedAt: ["datetime(3)", "NO"], acknowledgedAt: ["datetime(3)", "YES"],
  resolvedAt: ["datetime(3)", "YES"], createdById: ["varchar(191)", "YES"],
  resolvedById: ["varchar(191)", "YES"], createdAt: ["datetime(3)", "NO"],
  updatedAt: ["datetime(3)", "NO"], source: ["varchar(191)", "YES"],
};
export const alertIndexes = {
  PRIMARY: ["id"], Alert_createdById_fkey: ["createdById"],
  Alert_resolvedById_fkey: ["resolvedById"], Alert_organizationId_status_idx: ["organizationId", "status"],
  Alert_siteId_status_idx: ["siteId", "status"], Alert_deviceId_status_idx: ["deviceId", "status"],
  Alert_severity_status_idx: ["severity", "status"], Alert_detectedAt_idx: ["detectedAt"],
};
export const alertForeignKeys = {
  organizationId: ["Organization", "CASCADE"], siteId: ["Site", "SET NULL"],
  deviceId: ["Device", "SET NULL"], createdById: ["User", "SET NULL"], resolvedById: ["User", "SET NULL"],
};

export function verifyLegacyAlertSchema(columns, indexes, foreignKeys) {
  if (columns.length !== Object.keys(alertColumns).length) throw new Error("Legacy Alert column count differs");
  for (const [name, [type, nullable]] of Object.entries(alertColumns)) {
    const column = columns.find((r) => r.name === name);
    if (!column || column.type !== type || column.nullable !== nullable ||
        (type.startsWith("varchar") || type === "text" || type.startsWith("enum")) && column.collation !== "utf8mb4_unicode_ci") {
      throw new Error(`Legacy Alert column differs: ${name}`);
    }
  }
  for (const [name, expected] of Object.entries(alertIndexes)) {
    const actual = indexes.filter((r) => r.name === name).sort((a, b) => Number(a.position) - Number(b.position));
    if (JSON.stringify(actual.map((r) => r.column)) !== JSON.stringify(expected) ||
        actual.some((r) => r.prefix != null || Number(r.nonUnique) !== (name === "PRIMARY" ? 0 : 1))) {
      throw new Error(`Legacy Alert index differs: ${name}`);
    }
  }
  if (indexes.length !== Object.values(alertIndexes).flat().length || foreignKeys.length !== 5) {
    throw new Error("Legacy Alert index or foreign key count differs");
  }
  for (const [column, [table, rule]] of Object.entries(alertForeignKeys)) {
    const fk = foreignKeys.find((r) => r.column === column);
    if (!fk || fk.table !== table || fk.target !== "id" || fk.onDelete !== rule || fk.onUpdate !== "CASCADE") {
      throw new Error(`Legacy Alert foreign key differs: ${column}`);
    }
  }
}

export async function auditLegacyAlert(prisma, rows) {
  verifyLegacyAlertHistory(rows);
  const columns = await prisma.$queryRawUnsafe("SELECT COLUMN_NAME name, COLUMN_TYPE type, IS_NULLABLE nullable, COLLATION_NAME collation FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Alert'");
  const indexes = await prisma.$queryRawUnsafe("SELECT INDEX_NAME name, COLUMN_NAME `column`, SEQ_IN_INDEX position, SUB_PART prefix, NON_UNIQUE nonUnique FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Alert'");
  const foreignKeys = await prisma.$queryRawUnsafe("SELECT k.COLUMN_NAME `column`, k.REFERENCED_TABLE_NAME `table`, k.REFERENCED_COLUMN_NAME target, r.DELETE_RULE onDelete, r.UPDATE_RULE onUpdate FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME AND r.TABLE_NAME = k.TABLE_NAME WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = 'Alert' AND k.REFERENCED_TABLE_NAME IS NOT NULL");
  verifyLegacyAlertSchema(columns, indexes, foreignKeys);
}
