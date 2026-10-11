# NCI-030 — Immutable Professional Proposal/Closeout PDFs

## V1 contract
- A generated/sent document is tied to an immutable source snapshot/version.
- Controlled PDF generation produces reproducible output independent of later project edits.
- Apply client-safe field policy before rendering.
- Include organization branding, document type, version, generated timestamp and stable document identifier.
- Generated artifacts are private, tenant-scoped and auditable.
- Regeneration of an old version uses the old snapshot, not current mutable project state.

## QA
Snapshot reproducibility, client-safe redaction, tenant isolation, metadata/versioning and deterministic fixtures where practical.