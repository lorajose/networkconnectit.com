# Command Center QA Runtime Isolation

This document defines the non-production runtime boundary used for NCI-073 browser/device and functional QA.

## Hard boundaries

- QA must use a dedicated hostname and a dedicated MySQL database. It must never point at the production database.
- QA credentials, auth secrets, storage credentials and database URLs belong in the runtime secret store only; never commit them.
- QA private design storage must be isolated from production storage.
- Production hostname `command.networkconnectit.com` is reserved for the final MAIN/GoDaddy release and must not be used for QA.
- Do not run the production recovery flags in QA: `NCI_RECOVER_NCI049`, `NCI_RECOVER_NCI074`, or `NCI_RECOVER_ALERT_SCHEMA`.
- Do not use `DATABASE_ADMIN_URL` in the deployed QA runtime.
- Do not use a production data dump as QA seed data.

## Required QA identity

Choose the actual QA hostname before deployment and record it in NCI-073 evidence. Configure:

```env
NODE_ENV=production
NEXTAUTH_URL=https://<qa-host>/api/auth
NEXT_PUBLIC_APP_BASE_PATH=
NEXT_PUBLIC_MARKETING_SITE_URL=https://networkconnectit.com
NCI_RUNTIME_ENV=qa
NCI_DATABASE_TLS_MODE=verify-identity
NCI_ENABLE_FIRST_ADMIN_BOOTSTRAP=false
ENABLE_FIRST_ADMIN_BOOTSTRAP=false
FIRST_ADMIN_BOOTSTRAP_TOKEN=
DATABASE_URL=mysql://<qa-only-connection>?sslaccept=strict
DESIGN_STORAGE_DRIVER=filesystem
DESIGN_PRIVATE_STORAGE_ROOT=/absolute/private/qa/path
```

A Supabase private-storage backend may be used instead, but its project/bucket/service-role credentials must be QA-only.

## Database lifecycle

Before the first QA runtime start:

1. Confirm the database name/host are QA-only and record only non-secret identifiers in the evidence.
2. Back up the QA database if it already contains useful test state.
3. Apply migrations only to that QA database.
4. Never enable demo seeding against production.
5. Create representative non-production organizations/users/projects for cross-tenant testing.

QA runtime startup is intentionally migration-free. Use `npm run start:qa` (`scripts/start-qa.mjs`) only after the isolated QA database identity and runtime configuration pass the QA gate. `start:qa` validates the QA boundary and starts the standalone application; it does **not** run `prisma migrate deploy`.

Run migrations as a separate, controlled operation against the independently confirmed QA database before starting the candidate. Never use `scripts/start-godaddy.mjs` for QA: that is the production startup path and includes `prisma migrate deploy`.

## NCI-073 runtime evidence

Against the exact QA candidate SHA, record:
- deployed SHA and QA URL;
- Chrome desktop, Edge desktop, Safari desktop and iPad Safari;
- PDF/PNG/JPEG import and safe unsupported-DXF behavior;
- CSV/JPG/PDF exports plus topology/SVG where exposed;
- Design Studio → reviewed Takeoff/BOM → Estimate → Proposal;
- CLIENT_ADMIN direct-ID/cross-tenant negative checks;
- private asset access through authenticated routes;
- defects and retest SHA when applicable.

## Promotion rule

A green QA CI build is necessary but not sufficient. QA → UAT is allowed only after the required QA runtime evidence is complete and no release-blocking defect remains. MAIN and GoDaddy production remain separate later gates.

## Provisioning runbook

Provisioning is intentionally provider-neutral until an isolated QA host, database and private-storage target are selected. Do not point these steps at production.

1. Create a dedicated QA hostname (for example, a QA-only subdomain) that is not `command.networkconnectit.com`.
2. Create a dedicated MySQL database whose host/database identity visibly indicates QA/test/staging and whose transport satisfies the configured TLS mode.
3. Create QA-only private storage. For filesystem storage, use an absolute path outside the application `public/` tree. For Supabase storage, use a QA-only project/service-role credential and a bucket name that visibly identifies QA/test/staging.
4. Configure runtime secrets out-of-repository using the Required QA identity above. Keep both first-admin bootstrap flags disabled and leave recovery/admin database variables absent.
5. Run `npm run qa:gate` before any migration or application start. A gate failure is a hard stop.
6. Independently verify the non-secret QA database identity, then run the required Prisma migration deployment as a separate controlled QA operation. Do not use `start-godaddy.mjs`.
7. Start the exact candidate with `npm run start:qa`. Record candidate SHA, QA URL, deployment reference and test-data identity in the NCI-073 evidence sheet.
8. Execute the browser/device, import/export, reviewed E2E, private-asset and cross-tenant/direct-ID checks. Only recorded real execution may change those rows from PENDING.

### Provisioning stop conditions

Stop without migration/start if the hostname resolves to production, the database is production or cannot be independently identified as QA, storage is shared with production, TLS does not satisfy the QA gate, a bootstrap/recovery flag is enabled, or any required credential is missing/placeholder.
