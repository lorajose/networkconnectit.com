# NCI-033 Production Hardening — Pre-Deploy Evidence

This sheet prepares production hardening evidence. It does not authorize deployment.

## Candidate identity

- Candidate SHA:
- Previous production SHA:
- Operator:
- Timestamp:
- Canonical host: `https://command.networkconnectit.com/`

## Environment gate

Run `npm run release:gate` with the production environment loaded server-side. Record only PASS/FAIL and sanitized diagnostics.

Required PASS:
- [ ] `NODE_ENV=production`
- [ ] `NEXTAUTH_URL=https://command.networkconnectit.com/api/auth`
- [ ] `NEXT_PUBLIC_APP_BASE_PATH` empty
- [ ] strong non-placeholder `NEXTAUTH_SECRET`
- [ ] first-admin bootstrap disabled
- [ ] bootstrap token absent
- [ ] `NCI_RECOVER_NCI049` disabled
- [ ] `NCI_RECOVER_NCI074` disabled
- [ ] `NCI_RECOVER_ALERT_SCHEMA` disabled
- [ ] demo seed disabled
- [ ] `DATABASE_ADMIN_URL` absent
- [ ] DB transport/TLS mode explicitly configured
- [ ] private storage server-side and outside public web root

Never paste secret values into GitHub/Notion evidence.

## Migration history — read only first

Before any migration or application startup:

1. [ ] Fresh production DB backup created and verified readable.
2. [ ] Backup timestamp/location recorded.
3. [ ] Backup byte size and SHA-256 recorded.
4. [ ] Previous application SHA/package recorded.
5. [ ] Run `node scripts/audit-production-migration-history.mjs`.
6. [ ] No incomplete active migration record.
7. [ ] No migration recorded in DB that is absent from this release.
8. [ ] No applied migration checksum differs from local `migration.sql`.
9. [ ] No migration has multiple active applied records.
10. [ ] Pending local migrations are reviewed and expected.

The audit is read-only. Do not edit `_prisma_migrations`, do not mark migrations applied manually, and do not use hosted Import SQL to bypass Prisma history.

## DB/TLS evidence

Record:
- provider/database endpoint class (private/internal/public):
- TLS supported/required by provider:
- configured `NCI_DATABASE_TLS_MODE`:
- connection verification result:
- evidence reference:

If transport cannot be verified, NCI-033 remains open.

## Private storage evidence

- [ ] configured driver is filesystem or Supabase
- [ ] filesystem root is absolute and outside `public/`, or private Supabase bucket/service role is configured server-side
- [ ] authenticated upload/read succeeds
- [ ] unauthenticated/public read fails
- [ ] cross-tenant read fails
- [ ] no storage credential appears client-side

## Runtime model

V1 remains request/response Next.js. No background worker/poller is introduced in this gate.

## PASS rule

NCI-033 can pass only when environment, backup, migration-history, DB/TLS, private-storage, bootstrap/recovery and role/tenant smoke evidence are all recorded against the exact candidate SHA.
