# NCI-026 — SaaS Account Lifecycle Hardening

## Implemented security primitives
- Password reset: signed, purpose-bound, 15-minute token; current `authVersion` must match; successful reset changes the password hash and increments `authVersion`, making the token single-use and revoking existing JWT sessions.
- Verification: signed, purpose-bound, 24-hour token bound to user ID, current email and `authVersion`; already-verified, disabled, changed-email and stale-version tokens fail closed.
- Login: generic credential failure behavior plus bounded exponential backoff keyed by a SHA-256 digest rather than plaintext email. This is process-local protection; an edge/shared rate limiter remains recommended when horizontal runtime scaling is introduced.
- Sessions: `authVersion` is embedded in the JWT and revalidated against the current user; password, role/session invalidation and account-status changes revoke older sessions.
- Account status: disabled users cannot authenticate and active-state changes revoke prior sessions.
- Audit: structured account-security events exclude passwords, hashes, tokens and email addresses.

## MFA decision
MFA is **not required for the initial V1 launch** and is not represented as implemented. The V1 control set is strong password handling, short-lived recovery tokens, login backoff and revocable sessions. MFA remains a post-V1 hardening item, with TOTP/WebAuthn preferred over SMS. Platform-admin MFA can be promoted to a release requirement later without weakening the V1 controls above.

## Delivery boundary
Token issuance functions return secrets only to a trusted delivery adapter. Browser/API request handlers must return generic success semantics for reset requests and must never echo a reset or verification token. Email delivery UI/routes belong to NCI-034.

## Relationship
These primitives feed NCI-034 and NCI-028. NCI-026 does not create a parallel user-management UI.
