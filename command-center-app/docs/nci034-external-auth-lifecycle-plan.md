# NCI-034 — External User Authentication Lifecycle

## V1 security contract
- Organization-scoped authorized user list and invite/create flow.
- Role assignment constrained by actor role and tenant policy.
- Password reset tokens are single-use, short-lived and stored hashed.
- Login abuse controls are server-side and do not reveal account existence.
- Password/role/disable changes revoke or invalidate affected sessions.
- Security-sensitive account changes emit audit events.
- MFA decision is explicit before higher-risk customer access.

## Reconciliation
NCI-034 is the consolidated external-user lifecycle. Reuse NCI-026 hardening and NCI-028 user administration; avoid three competing account systems.