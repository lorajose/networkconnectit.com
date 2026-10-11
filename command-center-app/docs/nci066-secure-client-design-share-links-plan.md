# NCI-066 — Secure Client Design Share Links

## V1 contract
- Read-only opaque-token share links; never expose tenant/internal IDs.
- Store only a hash of the token server-side; support immediate revocation and expiration.
- Optional password protection uses a slow password hash and rate-limited verification.
- Contractor explicitly selects visible layers, details, downloads and pricing.
- Shared rendering uses the existing client-safe report/design policy; internal notes and costs are denied by default.
- View/download events are auditable without storing secrets.

## Security tests
- expired/revoked/wrong-password links fail closed;
- token cannot cross project/tenant boundaries;
- direct-ID guessing does not reveal existence;
- client-safe projection cannot be bypassed by query parameters.

## Dependency
Reuse NCI-073 export/security boundaries and NCI-037 audit events. Do not create a second public authorization model.