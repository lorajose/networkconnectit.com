# NCI-073 — Target Environment QA Runbook

Use this runbook when the Command Center QA runtime is available.

## 1. Identify candidate

```bash
git rev-parse HEAD
```

Record the SHA in `docs/qa-evidence-template.md`. Do not test an unidentified deployment.

## 2. Install and validate

```bash
npm ci
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate:deploy
npm run verify:staging
```

Do **not** run `npm run prisma:seed` against a real customer/production database.

## 3. Required runtime configuration

For a path-mounted Command Center at `/tools/command-center`:

```env
NEXTAUTH_URL=https://networkconnectit.com/tools/command-center/api/auth
NEXT_PUBLIC_APP_BASE_PATH=/tools/command-center
NEXT_PUBLIC_MARKETING_SITE_URL=https://networkconnectit.com
ENABLE_FIRST_ADMIN_BOOTSTRAP=false
```

Also configure a real `DATABASE_URL` and a long random `NEXTAUTH_SECRET` through the hosting environment. Do not commit those secret values.

For NCI-042 filesystem storage, configure a server-specific private path such as:

```env
BID_STORAGE_DRIVER=filesystem
BID_PRIVATE_STORAGE_ROOT=/home/<CPANEL_USER>/networkconnectit-private/bids
```

The directory must be persistent, writable by the Node application user, and outside the public web root. Replace `<CPANEL_USER>` on the server; never commit the real private path if it exposes environment-specific details you do not want public.

## 4. Runtime smoke test

1. Sign in as SUPER_ADMIN and confirm dashboard/projects/sites/devices/design studio load.
2. Repeat tenant-scoped navigation as CLIENT_ADMIN.
3. Confirm VIEWER is read-only.
4. Use a second organization to test direct-ID isolation.
5. Execute the full checklist in `nci-073-master-qa.md`.
6. Record evidence/failures in a copy of `qa-evidence-template.md`.

## 5. Release

Only after the candidate passes the master QA gate:

- resolve release-blocking defects;
- verify the final SHA again after any fix;
- rerun CI/build/security checks on that final SHA;
- verify deployed SHA matches the approved SHA;
- then update Notion tickets from QA/Ready to Done as their own acceptance evidence is satisfied.
