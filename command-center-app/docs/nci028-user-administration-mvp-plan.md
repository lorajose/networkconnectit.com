# NCI-028 — User Administration MVP

## MVP
- Authorized admins list only users visible under their tenant/role policy.
- Invite/create uses server-owned organization and constrained role assignment.
- Disable/reactivate invalidates affected access/session state as required.
- Cross-tenant user IDs fail closed and do not reveal account details.
- Security-sensitive mutations emit audit events.

## Relationship
NCI-028 supplies the administration UI/workflow; NCI-026 supplies security primitives; NCI-034 is the consolidated external-user lifecycle.