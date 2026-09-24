# Command Center production migration recovery runbook

This runbook is a release-gate procedure. It does not authorize or perform a production deployment.

## Required evidence before migration
1. Record the exact candidate Git SHA and confirm all required CI jobs are green for that SHA.
2. Run `npm run release:gate` with the production environment and retain the successful output.
3. Record the current production Prisma migration state with `npx prisma migrate status`.
4. Create a timestamped MySQL backup before any schema change:
   `mysqldump --single-transaction --routines --triggers --set-gtid-purged=OFF "$DB_NAME" > "command-center-predeploy-$TIMESTAMP.sql"`
   Use the production host/user through the approved secret mechanism; do not commit credentials or the dump.
5. Verify the dump is non-empty and record its byte size and SHA-256 checksum.
6. Copy the dump to the approved private backup location and verify it can be read from that location.

## Migration
1. Put the exact tested candidate SHA on the server.
2. Run `npm run prisma:migrate:deploy`.
3. Re-run `npx prisma migrate status`; all migrations must be applied.
4. Run the application build/start procedure only after migration succeeds.

## Post-migration smoke checks
- Authentication uses `https://command.networkconnectit.com/api/auth`.
- Tenant A cannot read/write Tenant B operational records or direct IDs.
- Company Operations loads technicians, scheduling, time, expenses, invoices and project profitability.
- Create/update smoke records only in an approved QA tenant and remove them after verification.
- Confirm invoice DRAFT→SENT, payment protection and time DRAFT→SUBMITTED→APPROVED.
- Confirm no recovery/bootstrap flags are enabled.

## Stop / rollback conditions
Stop the release if migration fails, application startup fails, authentication callbacks are incorrect, tenant isolation fails, or required smoke checks fail.

### Application rollback
Restore the previously recorded application release/SHA. Do not assume application rollback reverses database changes.

### Database recovery
Prisma migrations are forward migrations; do not improvise destructive reverse SQL in production.
If the schema/data must be restored:
1. Stop application writes.
2. Preserve a copy of the failed/current database for diagnosis.
3. Restore the verified predeploy dump to the approved recovery database/target according to hosting procedures.
4. Validate migration state, tenant counts and critical records before redirecting application traffic.
5. Start the previously known-good application SHA against the validated restored database.
6. Re-run auth, tenant-isolation and operations smoke checks.

## Evidence to attach to Release Gate 1
- candidate Git SHA
- CI run URL/results
- release-gate output
- pre-migration `prisma migrate status`
- backup timestamp, byte size and SHA-256 (never the dump itself)
- post-migration `prisma migrate status`
- smoke-check results
- rollback/restoration test or hosting-provider restoration evidence
- final release decision and operator/time

No database dump, password, DATABASE_URL, service-role key, token or private storage credential may be committed to GitHub or Notion.
