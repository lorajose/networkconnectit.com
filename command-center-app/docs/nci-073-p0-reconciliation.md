# NCI-073 — P0 Release Gate Reconciliation

## NCI-021 — Client-Safe Report Profiles

**Treatment:** release blocker for externally shared report surfaces until server-side profile behavior is demonstrated for the relevant exports.

**Evidence needed:** explicit profile selection, internal-field exclusion, direct-request bypass regression, representative runtime export.

## NCI-031 — Harden Client-Safe Commissioning Exports

**Treatment:** release blocker for commissioning exports distributed externally.

**Repository finding:** commissioning output is intentionally rich operational documentation and includes network/vault-reference/remote-access/topology/capacity/alert context. Raw credentials are not part of the report model, but client-safe minimization still requires a dedicated acceptance path.

**Evidence needed:** CLIENT_SAFE commissioning policy, regression coverage for excluded fields, runtime client-safe vs internal export comparison.

## NCI-032 — Extend Production Tenant/RBAC Coverage

**Treatment:** release blocker for multi-tenant production.

**Evidence needed:** automated suite green plus runtime direct-ID and forbidden-write tests across at least two tenants for capacity/topology/design/takeoff/export routes.

## NCI-033 — Production Deployment Hardening Gate

**Treatment:** release blocker for production, but not for preparing a QA branch/package.

**Evidence needed:** exact deployed SHA, production-like environment variables, migrations, bootstrap disabled, role smoke, tenant isolation, export checks, no demo seed in real environment.

## Decision boundary

These P0 tickets are not marked Done by NCI-073 documentation. They remain open until their own acceptance evidence exists.