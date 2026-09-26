# Git Branch Promotion Model

NetworkConnectIT uses four persistent environment branches:

- `dev` — active development integration branch.
- `qa` — owner/internal functional QA candidate.
- `uat` — user acceptance / pre-production candidate.
- `main` — production source branch only.

## Promotion flow

`feature/* or nci-*` → `dev` → `qa` → `uat` → `main`

Rules:
1. Feature/NCI work targets `dev`.
2. Promote to `qa` only after required CI is green.
3. Promote to `uat` only after internal QA acceptance.
4. Promote to `main` only when NCI-074 Production Release Gate is closed and production deployment is authorized.
5. Do not develop directly on `main`.
6. Production deployment must use an exact `main` SHA.
7. Environment-specific secrets and URLs must be supplied by runtime configuration, never committed.

## Command Center public entry

The NetworkConnectIT landing page should link users to:
https://command.networkconnectit.com/

Legacy `/tools/command-center/` remains compatibility-only and should redirect or serve as a fallback, not be the canonical application URL.
