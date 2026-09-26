# Production Release Gate 1

This document is the pre-deployment runbook for the consolidated V1 release. Passing CI is necessary but does not authorize production deployment by itself.

## Release candidate

- Keep the release PR in Draft until all pre-deploy checks below pass.
- Freeze one exact commit SHA for deployment.
- Require Public Source Secret Safety, `verify`, and `godaddy-root-build` to pass on that SHA.
- Run `npm run release:gate` against the production environment before application startup/deploy.

## Database and migration safety

The current release contains multiple Prisma migrations created across the Contractor OS / Command Center workstream. Do not assume only the two original NCI-074 migrations are pending, and do not infer production state from source history alone.

Before production deploy:

1. Export a fresh production database backup and record its timestamp/location.
2. Run only the read-only migration-history preflight (`node scripts/audit-production-migration-history.mjs`) against the production database and retain sanitized evidence.
3. Review `_prisma_migrations` state for incomplete active migrations, rolled-back entries, checksum mismatches, or unexpected history. Any such condition is a STOP condition until reconciled safely.
4. In particular, confirm the watched NCI-079 material-usage migration matches the expected checksum/history before any production mutation.
5. Do not rewrite an already-applied migration, do not mark a migration applied manually to bypass drift, and do not use the hosted database Import SQL feature for this release.
6. Only after the read-only audit, backup, environment gate, storage and DB/TLS checks pass may the normal startup/deploy path execute `prisma migrate deploy`.
7. Record the post-deploy Prisma migration status and confirm each newly applied migration is recorded exactly once.

## Backup and rollback

A rollback must preserve data.

1. Take a fresh DB export immediately before the release.
2. Record the previous production application commit SHA/package.
3. Deploy the frozen release candidate once.
4. If application/runtime QA fails but migrations succeeded, roll the application code back to the previous SHA first. Do not drop the new additive tables merely to roll back code.
5. Restore the database backup only for a confirmed data-integrity incident and only after preserving a copy of the failed-state database for investigation.
6. Never run demo seed against production.

## Production configuration

Required checks:

- `NEXTAUTH_SECRET` is strong and non-placeholder.
- `NEXTAUTH_URL` is HTTPS and matches the actual public auth endpoint.
- `NEXT_PUBLIC_APP_BASE_PATH` matches the deployed path.
- `ENABLE_FIRST_ADMIN_BOOTSTRAP=false`.
- `FIRST_ADMIN_BOOTSTRAP_TOKEN` is empty/removed.
- Old one-time recovery flags are disabled after their recovery is confirmed.
- Private bid/survey/work-order storage configuration is complete and server-only.
- Production contains no demo seed dataset.

The canonical production deployment is the dedicated Command Center host:
`NEXTAUTH_URL=https://command.networkconnectit.com/api/auth`
`NEXT_PUBLIC_APP_BASE_PATH=` (empty root-domain base path)

The legacy `/tools/command-center/` route is compatibility/fallback only and must not be used as the authoritative production auth/base-path configuration. Any future host or path migration requires a separate DNS/proxy/auth migration plan.

## Database transport / TLS

Before go-live, confirm the production MySQL connection path and provider requirements. Do not guess or silently append TLS parameters. Record whether the GoDaddy internal database endpoint is provider-private and whether TLS is supported/required. If transport cannot be verified, keep this item open rather than claiming TLS compliance.

## Runtime decision

V1 runs as a request/response Next.js application with Prisma migrations executed before server startup. Do not introduce background workers/pollers into this release without a separate runtime design and operational health strategy.

## Post-deploy production QA

After the single controlled deploy:

- health endpoint
- login/auth callback and base path
- SUPER_ADMIN / INTERNAL_ADMIN / CLIENT_ADMIN / VIEWER smoke tests
- cross-tenant direct-ID denial
- Project and Site customer-safe commissioning exports
- Capacity
- Site Survey -> floor-plan approval -> Work Order -> evidence -> testing -> punch list -> final acceptance -> closeout
- Estimate -> Proposal
- Design Studio -> Takeoff/BOM -> Estimate -> Proposal
- browser QA required by NCI-073

Production Release Gate 1 is PASS only after the pre-deploy checks are evidenced and the post-deploy QA completes successfully.


## P0/P1 V1 disposition

This classification is for Release Gate 1 only. A ticket is not marked Done merely because related code exists.

### Release blockers / must be evidenced before Gate 1 PASS

- NCI-012 Proposal Builder: keep open until production-grade PDF/output and proposal analytics acceptance criteria are evidenced or explicitly deferred from V1.
- NCI-021 / NCI-031 Client-safe commissioning exports: code and regression evidence exist; production role/tenant/export smoke remains required. Confirm the final policy satisfies the explicit allowlist requirement.
- NCI-032 Tenant isolation/direct-ID policy: regression coverage exists; production role/tenant smoke remains required.
- NCI-033 Production environment hardening: pre-deploy environment, migration, backup, recovery-flag, storage, and DB transport evidence remains required.
- NCI-073 Design Studio QA: target-runtime browser/iPad/E2E checks remain required after the controlled deploy.
- NCI-074 Production Release Gate 1: remains In Progress until every required pre-deploy and post-deploy item passes.

### Partial implementation; do not close as Done

- NCI-013 Site Survey: mobile/photo/structured/project linkage exists; offline/poor-connectivity behavior and survey report output remain open.
- NCI-014 Cable execution: Work Order lifecycle provides substantial execution coverage, but deeper cable-specific acceptance remains open.
- NCI-015 Closeout: package structure exists, but true branded immutable PDF, customer signature/auth flow, and As-Built output remain open.

### Post-V1 / not a reason to silently expand this release

- NCI-066 through NCI-072 remain post-V1 unless separately promoted through an explicit scope decision.
- NCI-004 remains open; existing free-tool workflow mapping has not been completed.
- NCI-047 remains open; historical PR numbering/title collisions are not implementation evidence for the current ticket.

## Production QA evidence sheet

Record PASS/FAIL plus evidence for every row. A failure blocks Gate 1 unless an explicit scope decision is documented.

| Area | Check | Evidence required |
| --- | --- | --- |
| Release | Deployed commit equals frozen SHA | deployed git revision |
| Runtime | health endpoint through the public base path | HTTP success + timestamp |
| Auth | login, callback, logout on `https://command.networkconnectit.com/` | successful session flow on canonical host |
| Roles | SUPER_ADMIN, INTERNAL_ADMIN, CLIENT_ADMIN, VIEWER | expected allow/deny result per role |
| Tenant security | direct-ID request across organizations | denial without data leakage |
| Exports | Project commissioning customer copy | customer-safe output |
| Exports | Site commissioning customer copy | customer-safe output |
| Capacity | site/project capacity routes | authorized same-tenant access + cross-tenant denial |
| Site Survey | assignment/session/photo/structured capture | successful field flow |
| Floor plan | draft -> approval | immutable approved snapshot/revision evidence |
| Work Order | create -> pulled/installed -> terminated -> test | PASS required for completion |
| Evidence | private work-order photo evidence | authorized retrieval; unauthorized denial |
| Punch | open issue blocks closeout; resolution clears it | gate behavior |
| Acceptance | final acceptance | accepted record before closeout |
| Closeout | generate package | manifest/version evidence |
| Commercial | Estimate -> Proposal | successful linked flow |
| Design | Design Studio -> Takeoff/BOM -> Estimate -> Proposal | successful linked flow |
| NCI-073 | target browsers/iPad/performance/E2E | QA evidence attached to ticket |

## Gate stop conditions

Stop the deployment or rollback application code if any of these occurs:

- release gate script fails;
- unexpected migration state, incomplete migration, checksum mismatch, or unresolved migration-history drift;
- backup cannot be confirmed;
- auth/base-path failure;
- cross-tenant data exposure;
- customer export exposes internal-only fields;
- private evidence/storage becomes publicly accessible;
- migrations fail;
- health endpoint fails after deployment.

Do not delete newly created additive tables merely to roll application code back.


## P0/P1 V1 classification — 2026-09-22

This classification controls Gate 1 only; it does not mark unfinished tickets Done.

### Release blockers / must pass Gate 1
- NCI-012 — commercial proposal flow: core proposal path must pass QA; PDF/analytics gaps remain tracked.
- NCI-015 — closeout: the implemented V1 closeout path must pass QA; professional immutable PDF remains separately tracked by NCI-030.
- NCI-021 / NCI-031 — client-safe report/export policy and runtime validation.
- NCI-032 — tenant/RBAC Capacity and direct-ID runtime validation.
- NCI-033 — production environment, migrations, backup/rollback and runtime gate.
- NCI-042 / NCI-043 / NCI-044 — estimating/takeoff/risk workspaces must pass their V1 QA paths.
- NCI-050 / 051 / 052 / 055 / 058 / 061 / 062 / 063 / 065 — Design Studio V1 functional chain must pass production QA.
- NCI-073 — production-target Design Studio QA.
- NCI-074 — consolidated release gate; closes last.

### Required V1 scope with documented partial implementation
- NCI-009 — ProjectInstallation remains the canonical project core; validate lifecycle integration, do not create a second Project model.
- NCI-013 — Site Survey V1 mobile/structured/photo/project-link flow is in scope. Offline-first and full survey-report output are not represented as complete.
- NCI-014 — Work Order cable execution implemented for the Gate 1 field flow; deeper topology/cable-run enhancements remain open.

### Post-V1 / does not block Gate 1 unless a dependency is discovered
- NCI-004, NCI-006, NCI-008, NCI-011.
- NCI-016, NCI-017 — Project Pass/subscriptions.
- NCI-018 — founding-contractor beta occurs after a successful production gate.
- NCI-023, NCI-024, NCI-026, NCI-027.
- NCI-030 — immutable professional binary proposal/closeout PDF hardening.
- NCI-034, NCI-036, NCI-037.
- NCI-039, NCI-040, NCI-041 — acquisition/SEO work does not authorize production release.
- NCI-047 — estimate-to-project commercial handoff remains open; PR-number collisions are not implementation evidence.
- NCI-053, NCI-054, NCI-056, NCI-059, NCI-060, NCI-064 — retain QA/backlog status and test where exercised, but they do not independently block Gate 1.
- NCI-066, NCI-070, NCI-072.

### Already completed foundation
NCI-001, NCI-002, NCI-003, NCI-007, NCI-010, NCI-019, NCI-020, NCI-022, NCI-035 (duplicate closure), NCI-038 and NCI-049 remain historical foundation evidence; Gate 1 does not reopen them unless a regression is found.

Status rule: code evidence may move a ticket toward Code Review/QA, but no ticket is marked Done solely by this classification. Production-sensitive tickets require target-runtime evidence.
