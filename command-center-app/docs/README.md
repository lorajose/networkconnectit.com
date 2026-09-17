# Command Center Documentation

## Deployment and QA

- [`staging-deployment-checklist.md`](./staging-deployment-checklist.md) — existing staging environment, role, tenant and commissioning-export smoke tests.
- [`nci-073-master-qa.md`](./nci-073-master-qa.md) — Design Studio master functional/security/performance release gate.
- [`nci-073-qa-ticket-reconciliation.md`](./nci-073-qa-ticket-reconciliation.md) — QA ticket matrix and evidence still required before Done.
- [`production-hardening-gate.md`](./production-hardening-gate.md) — P0 production/client-safe blockers and deployment architecture separation.
- [`nci-073-go-live-runbook.md`](./nci-073-go-live-runbook.md) — commands and sequence for target-environment QA.
- [`qa-evidence-template.md`](./qa-evidence-template.md) — per-candidate evidence record.

## Release principle

Automated CI/build/security checks are required, but target-environment acceptance remains mandatory for tickets whose criteria depend on deployment, tenant isolation, browser/device behavior, private storage, or client-safe exports.
