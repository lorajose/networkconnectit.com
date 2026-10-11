# NCI-028 — User Administration MVP

## Goal
Provide tenant-safe user administration for client organizations, building on NCI-026 account lifecycle hardening rather than duplicating authentication security.

## V1 scope
- CLIENT_ADMIN can list users only in the authenticated organization.
- CLIENT_ADMIN can invite users only into the authenticated organization.
- CLIENT_ADMIN can assign only approved client roles.
- CLIENT_ADMIN can disable/reactivate users in the same organization.
- Lifecycle mutations reuse NCI-026 authVersion invalidation so stale sessions are revoked.
- Platform roles remain inaccessible to client administrators.
- All mutations are server-authorized and tenant-scoped.

## Security constraints
- Organization ID is derived from the authenticated server session, never accepted from browser input for CLIENT_ADMIN.
- CLIENT_ADMIN cannot create or assign SUPER_ADMIN or INTERNAL_ADMIN.
- Role changes, disable/reactivate, and password-sensitive operations must invalidate existing sessions where appropriate.
- Prevent a client administrator from disabling the last active CLIENT_ADMIN in an organization without an explicit recovery path.
- Audit security-sensitive administration actions without logging passwords or invitation/reset tokens.

## Dependency
NCI-026 is the account lifecycle authority. NCI-028 must consume those primitives for active state and session invalidation.

## Acceptance evidence
- Tenant-scoped list/invite/update/disable/reactivate tests.
- Cross-tenant direct-ID negative tests.
- Privilege-escalation negative tests.
- Last-admin safety regression.
- Command Center CI, MySQL lifecycle regression and GoDaddy standalone build green.
