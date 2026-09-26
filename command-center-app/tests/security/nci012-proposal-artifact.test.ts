import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "prisma/migrations/20260925174500_nci012_proposal_artifacts/migration.sql"), "utf8");
const approval = readFileSync(resolve(process.cwd(), "lib/contractor-os/approval-repository.ts"), "utf8");
const actions = readFileSync(resolve(process.cwd(), "app/(protected)/proposals/proposal-actions.tsx"), "utf8");

test("proposal artifacts and analytics remain tenant scoped", () => {
  assert.match(migration, /CREATE TABLE `ProposalArtifact`/);
  assert.match(migration, /CREATE TABLE `ProposalEvent`/);
  assert.match(migration, /`organizationId` VARCHAR\(191\) NOT NULL/);
  assert.match(migration, /ProposalArtifact_org_proposal_idx/);
  assert.match(migration, /ProposalEvent_org_proposal_event_idx/);
});

test("proposal approval emits a version-bound analytics event", () => {
  assert.match(approval, /INSERT INTO ProposalEvent/);
  assert.match(approval, /proposalVersionId/);
  assert.match(approval, /'APPROVED'/);
  assert.match(approval, /version\.id/);
  assert.match(approval, /organizationId/);
});


test("proposal UI exposes a branded print-to-PDF artifact workflow", () => {
  assert.match(actions, /window\.print\(\)/);
  assert.match(actions, /Export \/ Save as PDF/);
});
