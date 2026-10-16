import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyLegacyAlertHistory, legacyAlertMigration } from './legacy-alert-history.mjs';
export const legacyRows = [
  { id: 'e41dbfa7-aa98-4f41-9dc7-f362c3ae6e7d', migrationName: legacyAlertMigration, checksum: '5d918c8d103f57d8ace81ed27c4ddb9c2d3a81b90c92eb9ad74747fbecbd5238', finishedAt: new Date('2026-09-21T02:45:08Z'), rolledBackAt: null, appliedStepsCount: 0 },
  { id: '9788262a-4208-4239-9c77-46bf1a615753', migrationName: legacyAlertMigration, checksum: 'd96af6c6cc4b86b734a8ea509020113550ea9ce85e639c9cc12d4cd8e15a0919', finishedAt: null, rolledBackAt: new Date('2026-09-21T02:45:08Z'), appliedStepsCount: 0 },
];
test('recognizes reviewed applied and rolled-back legacy records', () => verifyLegacyAlertHistory(legacyRows));
for (const [label, mutate] of [
  ['unknown checksum', r => r[0].checksum = '0'.repeat(64)],
  ['unknown identity', r => r[0].id = 'unknown'],
  ['unresolved failure', r => r[1].rolledBackAt = null],
  ['incomplete application', r => r[0].finishedAt = null],
  ['duplicate application', r => r.push({...r[0]})],
  ['missing rollback record', r => r.pop()],
  ['different migration', r => r[0].migrationName = 'another'],
]) test(`rejects ${label}`, () => { const r = structuredClone(legacyRows); mutate(r); assert.throws(() => verifyLegacyAlertHistory(r)); });
