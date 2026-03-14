# Staging Deployment Checklist and Smoke Test Guide

This guide is the final staging checklist for the NetworkConnectIT Security Command Center. It assumes the app is deployed separately from the static marketing site and that the app database is MySQL through Prisma.

## 1. Required Environment Variables

Set these before the first staging deploy:

```env
DATABASE_URL="mysql://..."
NEXTAUTH_URL="https://your-staging-host/api/auth"
NEXTAUTH_SECRET="long-random-secret"
NEXT_PUBLIC_APP_BASE_PATH=""
NEXT_PUBLIC_MARKETING_SITE_URL="https://networkconnectit.com"
ENABLE_FIRST_ADMIN_BOOTSTRAP="false"
FIRST_ADMIN_BOOTSTRAP_TOKEN=""
```

When the app is mounted behind a path proxy, `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_BASE_PATH` must match that public path exactly.

Example for path-based deployment:

```env
NEXTAUTH_URL="https://networkconnectit.com/tools/command-center/api/auth"
NEXT_PUBLIC_APP_BASE_PATH="/tools/command-center"
```

Notes:

- `DATABASE_ADMIN_URL` is only needed for local `prisma migrate dev` workflows. It is not required for normal staging deploys that use `prisma:migrate:deploy`.
- `NEXTAUTH_SECRET` must be real and non-placeholder.
- `ENABLE_FIRST_ADMIN_BOOTSTRAP` must stay `false` except during the short bootstrap window.

## 2. First-Admin Bootstrap Steps

Only use this flow for non-demo staging environments that do not already have an internal admin.

1. Deploy the app with migrations completed.
2. Temporarily set:

```env
ENABLE_FIRST_ADMIN_BOOTSTRAP="true"
FIRST_ADMIN_BOOTSTRAP_TOKEN="long-random-bootstrap-token"
```

3. Open the bootstrap route:

- root deployment: `/bootstrap/first-admin`
- proxied path deployment: `/tools/command-center/bootstrap/first-admin`

4. Create the first internal user.
5. The route creates a `SUPER_ADMIN` only.
6. Sign in through the normal login page.

## 3. Post-Bootstrap Cleanup Steps

Immediately after the first internal admin signs in:

1. Set `ENABLE_FIRST_ADMIN_BOOTSTRAP="false"`.
2. Remove or rotate `FIRST_ADMIN_BOOTSTRAP_TOKEN`.
3. Redeploy the app if your platform does not auto-apply env changes.
4. Confirm `/bootstrap/first-admin` is no longer usable.
5. Create any additional internal users from inside the app instead of using bootstrap again.

## 4. Migration and Seed Order

For a real non-demo staging environment:

1. `npm install`
2. `npm run prisma:generate`
3. `npm run prisma:validate`
4. `npm run prisma:migrate:deploy`
5. Start the app
6. Run first-admin bootstrap

For a demo staging environment:

1. `npm install`
2. `npm run prisma:generate`
3. `npm run prisma:validate`
4. `npm run prisma:migrate:deploy`
5. `npm run prisma:seed`
6. Start the app

Important:

- `npm run prisma:seed` is destructive to app tables and is demo-only.
- Never seed a real customer staging or production database with the demo dataset.

## 5. Recommended Staging Verification Flow

Run this sequence after deploy:

1. `npm run verify:staging`
2. Open the login page and verify the app base path is correct.
3. Confirm the runtime warning banner is clean or only contains expected non-blocking warnings.
4. Sign in as the intended test role.
5. Load dashboard, projects, sites, devices, alerts, topology, capacity, command map, and export pages.
6. Confirm no broken links, infinite redirects, or auth callback issues.
7. Confirm print/export pages render cleanly in browser print preview.

## 6. Role-by-Role Smoke Tests

### SUPER_ADMIN

- Can sign in successfully.
- Can access dashboard, organizations, projects, sites, devices, alerts, users, settings, command map.
- Can open project wizard.
- Can open bulk device import.
- Can view topology and capacity pages.
- Can open export pages.
- Can create or edit tenant data.

### INTERNAL_ADMIN

- Can sign in successfully.
- Can access command map and global operational views.
- Can manage projects, sites, devices, alerts, and health simulation flows.
- Can export project and site reports.
- Can use bulk import and onboarding wizard.

### CLIENT_ADMIN

- Can sign in successfully.
- Only sees their own organization data.
- Cannot access cross-tenant command map.
- Can access tenant-scoped sites, devices, projects, topology, capacity, and reports if permitted by current app rules.
- Cannot view or mutate another tenant by direct URL.

### VIEWER

- Can sign in successfully.
- Has read-only access only.
- Cannot see write actions.
- Cannot complete bulk import, onboarding wizard submission, or alert resolution flows.
- Cannot access internal-only routes such as command map.

## 7. Tenant Isolation Checks

Run these explicitly:

1. Sign in as one client tenant user.
2. Confirm organization, project, site, device, alert, topology, capacity, and export pages only show that tenant.
3. Copy a site or project ID from another tenant and hit the URL directly.
4. Confirm the request resolves safely without leaking data.
5. Confirm export pages are scoped the same way as the normal detail pages.
6. Confirm bulk import rejects cross-tenant project/site relationships.
7. Confirm project wizard cannot attach sites or devices outside the current tenant scope.

## 8. Export / Report Checks

Verify both:

- project commissioning export
- site commissioning export

Checks:

- Header branding renders correctly.
- Summary metadata is complete.
- Network segments, access references, NVR mappings, topology, PoE/capacity, readiness, and alerts render without broken sections.
- Sparse records show clean empty states instead of broken tables.
- Browser print preview is usable for `Save as PDF`.
- Sensitive secrets are not printed from `AccessReference`.

## 9. Known Caveats

- Export is print-friendly HTML, not binary server-generated PDF.
- Demo seed data includes internal admins, so first-admin bootstrap will automatically lock itself in seeded environments.
- If the app is path-mounted, `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_BASE_PATH` must stay aligned or login redirects will break.
- If the database connection uses relaxed TLS for staging, that should be tightened before production.
- Render-style free hosting may sleep between requests and is acceptable for demo/staging only.

## 10. Go-Live Readiness Checklist

Treat the environment as go-live ready only when all of these are true:

- Environment variables are complete and non-placeholder.
- `NEXTAUTH_SECRET` is strong.
- `NEXTAUTH_URL` matches the public auth endpoint.
- `NEXT_PUBLIC_APP_BASE_PATH` matches the deployed path, if used.
- `DATABASE_URL` points to the correct database.
- `ENABLE_FIRST_ADMIN_BOOTSTRAP` is disabled.
- First internal admin exists and can sign in.
- No demo seed data exists in the real environment unless the environment is explicitly a demo tenant.
- `npm run prisma:migrate:deploy` has been applied successfully.
- `npm run verify:staging` passes.
- Role-by-role smoke tests pass.
- Tenant isolation checks pass.
- Export/report print checks pass.
- Internal-only routes are inaccessible to client/viewer roles.
- Command map, topology, capacity, and project detail pages load with real data.
