# NCI-026 — SaaS Account Lifecycle Hardening

## Security primitives
- Password reset: short-lived, single-use, hashed token and session invalidation after success.
- Verification: explicit email/account verification state and replay-safe token lifecycle.
- Login: rate limiting/backoff and generic failure responses.
- Sessions: revocation strategy for password, role and account-status changes.
- MFA: decision and threat-based rollout plan.
- Audit: emit safe security events without credentials/tokens.

## Relationship
These primitives feed NCI-034. NCI-026 should not create a parallel user-management UI.