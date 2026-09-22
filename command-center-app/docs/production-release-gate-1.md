# Production Release Gate 1

This document is the pre-deployment runbook for the consolidated V1 release. Passing CI is necessary but does not authorize production deployment by itself.

## Release candidate

- Keep the release PR in Draft until all pre-deploy checks below pass.
- Freeze one exact commit SHA for deployment.
- Require Public Source Secret Safety, `verify`, and `godaddy-root-build` to pass on that SHA.
- Run `npm run release:gate` against the production environment before application startup/deploy.

## Database and migration safety

The NCI-074 branch introduces these migrations:

- `20260922031000_nci074_site_survey_foundation`
- `20260922033500_nci074_survey_floor_plan_draft`

Both are additive `CREATE TABLE` migrations. They do not contain `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or destructive data rewrites.

Before production deploy:

1. Export a fresh production database backup and record its timestamp/location.
2. Confirm both migration names are absent from production `_prisma_migrations`.
3. If either migration is already recorded or its tables already exist unexpectedly, STOP. Do not edit the existing migration and do not mark it applied manually. Reconcile state with a follow-up migration.
4. Run only `prisma migrate deploy` through the normal startup/deploy path.
5. Never use the hosted database Import SQL feature for this release.

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

Current path-based deployment must be treated as authoritative unless the release plan explicitly migrates hosts:
`NEXTAUTH_URL=https://networkconnectit.com/tools/command-center/api/auth`
`NEXT_PUBLIC_APP_BASE_PATH=/tools/command-center`

Do not switch to `app.networkconnectit.com` as part of this release without a separate DNS/proxy/auth migration plan.

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
