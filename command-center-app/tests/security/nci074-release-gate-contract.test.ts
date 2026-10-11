import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const gate = () =>
  readFileSync(resolve(process.cwd(), "docs/nci074-consolidated-v1-release-gate.md"), "utf8");

test("NCI-074 current release contract keeps critical dependency order explicit", () => {
  const source = gate();
  assert.match(source, /NCI-017 Subscription QA/);
  assert.match(source, /NCI-073 Design Studio runtime QA/);
  assert.match(source, /NCI-033 Production hardening/);
  assert.match(source, /NCI-074 Consolidated release decision/);
  assert.match(source, /NCI-074 closes last/);
});

test("NCI-074 release contract blocks test Stripe and unsafe production evidence", () => {
  const source = gate();
  assert.match(source, /sk_test_/);
  assert.match(source, /subscription webhook secret/);
  assert.match(source, /Fresh pre-deploy DB backup/);
  assert.match(source, /migration-history audit/);
  assert.match(source, /cross-tenant data exposure/);
});
