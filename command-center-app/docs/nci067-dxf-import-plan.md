# NCI-067 — DXF Import with Layer Selection

## V1 contract
- Parse a documented DXF subset only; unsupported entities produce warnings, never silent geometry loss.
- Import is staged: upload → inspect units/layers/entities → select layers → preview → user confirms commit.
- Validate units and calibrated scale before creating Design Studio primitives.
- Convert only approved entity types to locked/editable primitives with deterministic provenance.
- Apply file-size/entity-count/time limits and reject malformed input fail-closed.
- Imported assets remain tenant/project scoped.

## Entitlement
DXF is reserved for BUSINESS by NCI-017/NCI-072, but remains unavailable until this implementation and QA are green.

## QA
Fixtures must cover units, layers, unsupported entities, malformed files, oversized files, cross-tenant access and geometry fidelity.