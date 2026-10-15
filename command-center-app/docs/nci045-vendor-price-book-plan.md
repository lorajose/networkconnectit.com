# NCI-045 — Vendor Price Book & Quote Tracking

## MVP
- Tenant-scoped vendor price records: vendor, manufacturer, SKU, description, unit cost, effective/updated date and lead-time note.
- Quote evidence is private and attached to project/estimate with provenance.
- Estimate line selects a price source, then snapshots price/evidence identity into the estimate version.
- Later catalog changes never mutate historical estimates.
- NCI-010 remains the pricing authority.

## QA
Tenant isolation, immutable estimate snapshots, stale/new price selection, evidence authorization and audit trail.