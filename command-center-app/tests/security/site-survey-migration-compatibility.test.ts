import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migration = readFileSync(
  resolve(process.cwd(), "prisma/migrations/20260922033500_nci074_survey_floor_plan_draft/migration.sql"),
  "utf8"
);
const repository = readFileSync(
  resolve(process.cwd(), "lib/contractor-os/project-approval-work-order.ts"),
  "utf8"
);

test("work order migration avoids MariaDB reserved TERMINATED identifier", () => {
  assert.doesNotMatch(migration, /\bterminated\s+BOOLEAN\b/i);
  assert.match(migration, /\bisTerminated\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+FALSE\b/i);
});

test("work order repository maps isTerminated to the domain terminated field", () => {
  assert.match(repository, /isTerminated AS terminated/);
  assert.match(repository, /SET pulledInstalled=\$\{input\.pulledInstalled\},isTerminated=\$\{input\.terminated\}/);
});
