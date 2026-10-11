# NCI-037 — Operations Runbook

## Audit events
Security-sensitive and administrative mutations must emit structured events containing actor, organization, action, target, timestamp and result. Metadata is allow-listed by behavior: keys suggesting passwords, secrets, tokens, hashes, authorization/cookies or document contents are removed before logging.

## Database backup
- Production database backup: daily minimum, plus a backup immediately before an authorized production migration.
- Retention target: 30 daily backups and 12 monthly recovery points where the provider supports it.
- Backups must be encrypted at rest and access limited to production operators.
- The production database owner is responsible for confirming backup completion before a release migration.

## Restore test
A restore test is required before NCI-037 can close. Restore into an isolated non-production database, never over the live database. Record date, backup identifier, target environment, operator, elapsed time, migration state, smoke-test result and cleanup confirmation.

No production restore is authorized by this document or ticket implementation.

## Application errors and alerting
V1 selection: structured server logs are the baseline source. Production hosting must retain application stderr/stdout and provide an operator-visible alert path for repeated HTTP 5xx, process crashes or failed startup/release gates. A dedicated external error service can be added later without changing the audit contract.

## Runtime health
`GET /api/health` returns a non-cached runtime snapshot with service identity, timestamp, process uptime and environment. It intentionally exposes no database credentials, secrets, tenant data or build-time configuration. `HEAD /api/health` remains available for lightweight probes.

## Retention
- Security/admin audit logs: 365 days target.
- General application/runtime logs: 30 days target.
- Generated customer artifacts: retain according to the owning organization's product/data lifecycle; deletion must not be inferred from log retention.
- Restore-test evidence: retain with the corresponding release evidence for at least 365 days.

## Release evidence
NCI-037 may move through automated QA when source tests and CI are green, but it cannot be Done until the isolated production-backup restore test has a recorded successful result. NCI-033/NCI-074 remain the production release gates.