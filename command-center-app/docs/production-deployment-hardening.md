# Production Deployment Hardening Gate (NCI-033)

This checklist is a mandatory production preflight. It does not authorize deployment; NCI-074 remains the release gate.

## Automated environment blockers
Run `npm run release:gate` with the exact production environment before migrations. Production startup also runs this gate automatically before `prisma migrate deploy`.

The gate requires:
- strong non-placeholder `NEXTAUTH_SECRET` (32+ characters);
- canonical HTTPS `NEXTAUTH_URL=https://command.networkconnectit.com/api/auth` with an empty root-domain base path;
- first-admin bootstrap disabled and bootstrap token removed;
- recovery/admin database flags absent;
- demo seed explicitly disabled with `NCI_ALLOW_DEMO_SEED=false`;
- non-loopback production database configuration;
- explicit database TLS policy with `NCI_DATABASE_TLS_MODE=required|verify-ca|verify-identity`;
- configured private evidence storage.

The TLS flag is an operational assertion: hosting/database configuration must actually match the selected mode. Prefer `verify-identity` where the provider supports certificate hostname verification.

## Demo data
`prisma/seed.cjs` is development/demo data and MUST NOT be executed against production. Do not run `npm run prisma:seed` during production provisioning, startup, migration, recovery, or deployment.

## Migrations
Production startup runs the release gate before `prisma migrate deploy`. Never run `prisma migrate dev` in production. Recovery flags are exceptional, guarded operations and must be disabled for normal release.

## Role and tenant smoke test
Before opening traffic, verify with non-demo accounts:
1. internal admin can access intended global administration;
2. tenant admin can read/write only its own organization;
3. viewer can read permitted tenant data but cannot mutate inventory/commercial data;
4. direct-ID evidence/assets from another tenant return access denied/not found;
5. unauthenticated protected routes redirect/reject.

Automated RBAC/tenant regressions must also be green in Command Center CI.

## Backup / restore
Before migrations:
1. create a provider/database-native backup or logical dump and record timestamp/database/version;
2. verify the backup is readable and non-empty;
3. retain it outside the application deployment directory with restricted access;
4. record the restore command/procedure for the provider;
5. for a destructive migration, rehearse restore in a non-production database first.

Restore procedure:
1. stop application writes/traffic;
2. provision/select the recovery database;
3. restore the verified backup using the database provider's supported restore mechanism;
4. point a non-public application instance at the restored database;
5. run Prisma status/validation plus role/tenant smoke tests;
6. only then repoint production traffic.

Do not store database credentials or backup archives in Git.

## Runtime decision: workers / polling
Current production runtime is a request-driven Next.js standalone Node process on GoDaddy shared hosting. Do not add durable background workers, queues, or high-frequency polling inside that web process. Future scheduled/polling work must use an external scheduler/worker service with idempotent jobs, explicit retry policy, observability, and tenant scoping. Until such infrastructure is selected, background-worker-dependent features are not production-ready.

## Evidence required for release record
Capture the exact Git SHA, CI run, Secret Safety run, migration result, backup timestamp/reference, TLS mode, smoke-test result, and operator/date. Never record secret values.
