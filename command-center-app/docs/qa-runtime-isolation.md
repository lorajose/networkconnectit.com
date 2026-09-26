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
ENABLE_FIRST_ADMIN_BOOTSTRAP=false
FIRST_ADMIN_BOOTSTRAP_TOKEN=
DATABASE_URL=mysql://<qa-only-connection>
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

The current `start-godaddy.mjs` runs `prisma migrate deploy` during startup. Therefore it must not be invoked for QA until the isolated QA database connection has been independently confirmed.

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
