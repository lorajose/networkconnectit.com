# Production Hardening Gate

This checklist separates **code/build readiness** from **production readiness**. Passing CI does not by itself authorize a production release.

## P0 gates to reconcile before go-live

### NCI-021 — Client-safe report profiles

- Confirm every externally shareable report/export has an explicit client-safe policy/profile.
- Confirm internal-only fields are excluded by policy rather than only hidden in UI.
- Confirm pricing and internal operational data cannot leak through direct parameters or alternate export routes.

### NCI-031 — Client-safe commissioning exports

- Commissioning export currently includes operational fields such as network segments, vault metadata, remote-access references, topology/capacity, alerts and health context.
- Before client distribution, define and test a client-safe commissioning profile that excludes internal-only operational metadata.
- Raw credentials/secrets must never be exported.

### NCI-032 — Tenant/RBAC capacity and direct-ID coverage

- Keep the automated security suite green.
- Runtime-test direct-ID access for capacity, topology, design, takeoff and export routes with at least two tenant organizations.
- Verify write actions fail closed, not only page loads.

### NCI-033 — Production deployment hardening

- Production/staging runtime variables must be non-placeholder and internally consistent.
- Database migrations must be applied with `prisma:migrate:deploy`.
- First-admin bootstrap must be disabled after initial admin creation.
- No demo seed in a real customer environment.
- Verify the deployed revision matches the approved Git commit.
- Run role smoke tests, tenant isolation and export/report checks before go-live.

## Deployment architecture observation

The existing `deploy-cpanel.yml` workflow deploys the **static website** and intentionally ignores `command-center-app/**` changes on push. Therefore a green static cPanel deployment is **not evidence that Command Center/Design Studio was deployed**. Command Center requires its own runtime deployment path/process (Node/Next standalone app, database, environment variables and migrations) before NCI-073 runtime QA can be executed.

## Private bid storage

For NCI-042, filesystem storage is acceptable only when the configured path is persistent and outside the public web root. On an ephemeral application filesystem, use the private Supabase storage driver. Never expose a service-role key through `NEXT_PUBLIC_*`, browser code, logs or screenshots.

## Release rule

Do not mark NCI-021, NCI-031, NCI-032, NCI-033, NCI-042, NCI-065 or NCI-073 Done solely from local/CI evidence. Close each ticket only after its target-environment acceptance criteria are evidenced.