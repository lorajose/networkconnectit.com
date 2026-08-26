# NCI-042 — Estimating Workspace & Bid Document Intake

## Intent

Create the pre-estimate workspace without duplicating Organization, Site, ProjectInstallation, or Estimate ownership.

## Data boundary

- `BidWorkspace.organizationId` is mandatory and is the tenant boundary.
- `projectInstallationId` is optional so pre-award bids can exist before a delivery project is created.
- `estimateId` is optional until the bid package is ready to price.
- `BidDocument` stores classification and file metadata only.
- Binary documents belong in private object storage. `sourceKey` is an opaque storage key, not a public URL.
- Every query/write must scope by `organizationId`; tenant-scoped users may not choose a different organization.

## Document classes

Drawings, specifications, scope, addenda, vendor quotes, subcontractor quotes, and other supporting documents.

## Delivery sequence

1. Persistence + validation + protected workspace foundation.
2. Tenant-safe create/edit server actions and bid list/detail views.
3. Private object-storage upload and document version/revision handling.
4. Link a ready bid package to NCI-010 Estimate and preserve source evidence.

AI is not authoritative in this workflow. Future document analysis may suggest classifications, quantities, and scope risks, but users approve changes and the deterministic Cost Engine remains authoritative for pricing arithmetic.
