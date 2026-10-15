# NCI-037 — Audit, Backup & Operational Observability

## V1 controls
- Security/admin mutations emit structured JSON audit records with action, result, actor, organization, target and timestamp.
- Audit metadata is allow-limited by value type/length and drops keys that look like passwords, secrets, tokens, authorization headers, cookies, hashes or document contents.
- `/api/health` is the non-secret runtime liveness endpoint and must remain `no-store`.
- Application/runtime errors are collected by the hosting provider in V1; production alert routing must be configured and evidenced before NCI-074 closes.

## Backup policy
- Production MySQL: automated daily backup minimum.
- Retention target: 30 daily restore points and 12 monthly restore points where the provider supports it.
- Backups must be encrypted at rest and access restricted to production operators.
- A restore test must be executed into an isolated non-production database before release closure. Record date, operator, backup identifier, restore duration, integrity checks and cleanup result.
- Never run a restore over the production database as a release test.

## Retention
- Security/audit logs: 90 days searchable minimum; archive up to 1 year when operationally available.
- Application error logs: 30 days minimum.
- Generated customer artifacts follow the product/customer retention policy; logs must not contain their contents.

## Release evidence required
NCI-037 can reach QA from automated controls, but Done requires evidence of the configured production backup schedule, alert destination and a successful isolated restore test. These production operations remain gated by NCI-033/NCI-074 and require separate deployment authorization.
