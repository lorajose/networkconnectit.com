# NCI-042 Acceptance Progress

## Implemented in foundation increment

- Protected `/bids` workspace and navigation entry.
- Role policy for SUPER_ADMIN, INTERNAL_ADMIN, and CLIENT_ADMIN; VIEWER excluded.
- Tenant-scoped BidWorkspace/BidDocument persistence migration.
- Document classification, revision, MIME, size, and private storage-key metadata.
- Optional links to existing ProjectInstallation and Estimate records.
- Input validation and regression coverage.

## Remaining before NCI-042 can be Done

- Tenant-safe create/edit/list/detail server actions and UI.
- Organization/project selection using existing records without duplication.
- Secure private binary upload.
- Document revision/version UX and source evidence retained per estimate version.
- End-to-end link from ready bid package into NCI-010 Estimate.
- CI, migration staging validation, and functional QA.
