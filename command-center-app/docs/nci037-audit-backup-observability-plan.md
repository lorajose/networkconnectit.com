# NCI-037 — Audit Log, Backup & Operational Observability

## V1 controls
- Structured audit events for security/admin mutations: actor, tenant, action, target, timestamp, result and safe metadata.
- Never log secrets, reset tokens, passwords or sensitive document contents.
- Document DB backup frequency, retention, encryption and restore ownership.
- Record a restore test result before production release closure.
- Select application error logging/alerting and runtime health visibility.
- Define retention for logs and generated artifacts.

## Release relationship
NCI-037 supplies durable evidence for NCI-033/NCI-074, but production actions remain separately authorized.