# NCI-068 — DXF Export for CAD Handoff

## V1 contract
- Export supported walls, devices, routes and labels to deterministic DXF layers.
- Preserve calibrated coordinates/units and include source project/version metadata.
- Server-side BUSINESS entitlement is mandatory; UI gating is informational only.
- Export uses client-safe visibility rules and never leaks internal pricing/notes unless explicitly allowed by an internal-only policy.
- Layer naming has stable defaults with validated configuration.

## QA
Round-trip geometry fixtures, unit/scale checks, escaping/labels, entitlement denial, tenant isolation and deterministic output snapshots.

## Dependency
Build after NCI-067 establishes the supported CAD geometry/unit vocabulary.