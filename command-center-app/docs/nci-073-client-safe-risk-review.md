# NCI-073 — Client-Safe Export Risk Review

## Finding

The existing commissioning report model/view is an operational handoff export. It includes fields such as network segments/subnets/gateways, vault provider/path metadata, remote-access method, topology/capacity context, alerts and health information. The view states that raw credentials are excluded, which is necessary, but that does not automatically make all operational metadata appropriate for every external client recipient.

## Release treatment

Until NCI-021/NCI-031 acceptance proves a dedicated client-safe commissioning policy/profile, treat commissioning exports as controlled operational documents rather than universally safe public/client-share links.

## Required acceptance

- Define explicit CLIENT_SAFE vs INTERNAL commissioning policy.
- Client-safe mode excludes internal-only operational metadata by server-side policy.
- Direct query/route parameters cannot re-enable excluded sections for a client-safe issue.
- Raw credentials/secrets remain impossible to export in either mode.
- Add regression tests for fields that must never appear in CLIENT_SAFE output.
- Runtime-test both profiles with representative data before NCI-031 Done.
