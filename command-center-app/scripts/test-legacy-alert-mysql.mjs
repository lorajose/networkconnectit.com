import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { auditLegacyAlert } from './legacy-alert-history.mjs';
import { legacyRows } from './test-legacy-alert-history.mjs';
const url = new URL(process.env.DATABASE_URL || 'mysql://invalid');
if (process.env.CI !== 'true' || url.hostname !== '127.0.0.1' || url.pathname !== '/operations_ci_test') throw new Error('Requires disposable CI MySQL');
const prisma = new PrismaClient();
const created = [];
try {
  // Run before other integration fixtures; never drop pre-existing tables.
  for (const name of ['Organization', 'Site', 'Device', 'User']) {
    await prisma.$executeRawUnsafe(`CREATE TABLE \`${name}\` (id VARCHAR(191) PRIMARY KEY) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    created.push(name);
  }
  await prisma.$executeRawUnsafe(readFileSync(new URL('../tests/fixtures/legacy-alert.sql', import.meta.url), 'utf8'));
  created.push('Alert');
  await auditLegacyAlert(prisma, legacyRows);
  await prisma.$executeRawUnsafe('ALTER TABLE Alert DROP INDEX Alert_detectedAt_idx');
  await assert.rejects(auditLegacyAlert(prisma, legacyRows), /index differs/);
  await prisma.$executeRawUnsafe('CREATE INDEX Alert_detectedAt_idx ON Alert(detectedAt)');
  await prisma.$executeRawUnsafe('ALTER TABLE Alert MODIFY COLUMN source VARCHAR(64)');
  await assert.rejects(auditLegacyAlert(prisma, legacyRows), /column differs/);
  await prisma.$executeRawUnsafe('ALTER TABLE Alert MODIFY COLUMN source VARCHAR(191)');
  await prisma.$executeRawUnsafe('ALTER TABLE Alert DROP FOREIGN KEY Alert_siteId_fkey');
  await assert.rejects(auditLegacyAlert(prisma, legacyRows), /foreign key count differs/);
  console.log('Legacy Alert MySQL: reviewed schema accepted; index, column and foreign-key drift rejected.');
} finally {
  for (const name of created.reverse()) await prisma.$executeRawUnsafe(`DROP TABLE \`${name}\``);
  await prisma.$disconnect();
}
