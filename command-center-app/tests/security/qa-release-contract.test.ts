import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const appRoot = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(appRoot, relativePath), "utf8");
}

test("NCI-073 master QA gate retains required release checks", () => {
  const qa = read("docs/nci-073-master-qa.md");

  for (const required of [
    "Design → Takeoff/BOM → Estimate → Proposal",
    "CLIENT_SAFE",
    "Cross-tenant direct IDs fail closed",
    "Safari, Chrome and Edge",
    "iPad/tablet",
    "BID_PRIVATE_STORAGE_ROOT",
    "no P0 production-hardening blocker"
  ]) {
    assert.ok(qa.includes(required), `missing QA gate: ${required}`);
  }
});

test("production gate documents Command Center deployment separation", () => {
  const gate = read("docs/production-hardening-gate.md");
  const deployWorkflow = read("../.github/workflows/deploy-cpanel.yml");

  assert.match(deployWorkflow, /command-center-app\/\*\*/);
  assert.match(gate, /static website/i);
  assert.match(gate, /not evidence that Command Center\/Design Studio was deployed/i);
  assert.match(gate, /NCI-021/);
  assert.match(gate, /NCI-031/);
  assert.match(gate, /NCI-032/);
  assert.match(gate, /NCI-033/);
});

test("QA evidence template requires exact candidate and release decision", () => {
  const evidence = read("docs/qa-evidence-template.md");

  assert.match(evidence, /Git SHA/);
  assert.match(evidence, /Tenant\/RBAC\/direct-ID/);
  assert.match(evidence, /Client-safe report/);
  assert.match(evidence, /Candidate accepted/);
  assert.match(evidence, /Candidate rejected/);
});
