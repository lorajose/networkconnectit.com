# NCI-034 — External User Authentication Lifecycle

## V1 security contract
- Organization-scoped authorized user list and invite/create flow are provided by NCI-028.
- Role assignment is constrained by authenticated actor role and tenant policy.
- Password reset links use NCI-026 signed, purpose-bound, 15-minute tokens and become unusable after the password change increments authVersion.
- Reset requests return the same browser response whether or not an eligible account exists.
- Password reset delivery uses the server-only Resend REST API adapter. Production requires RESEND_API_KEY, AUTH_EMAIL_FROM and an HTTPS AUTH_PUBLIC_BASE_URL.
- Login abuse controls remain server-side and do not reveal account existence.
- Password, role and disable changes invalidate affected sessions through authVersion.
- Security-sensitive account changes emit structured audit events without passwords, hashes or reset tokens.

## MFA decision
MFA is not required for the initial V1 customer access profile and is not represented as implemented. Post-V1, prefer TOTP or WebAuthn/passkeys over SMS. Promote MFA to a pre-launch requirement if higher-risk platform administration is exposed to external customers.

## Reconciliation
NCI-034 is the consolidated external-user lifecycle. It reuses NCI-026 hardening and NCI-028 user administration rather than creating competing account systems.
