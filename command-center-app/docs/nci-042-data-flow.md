# NCI-042 Data Flow

`Organization` → `BidWorkspace` → `BidDocument[]`

A bid may optionally reference an existing `ProjectInstallation`. When pricing starts, the bid may link to the existing `Estimate` record. NCI-042 does not introduce a duplicate customer, site, project, or pricing model.

Private document binary → object storage → opaque `sourceKey` → `BidDocument` metadata.

Ready bid package → NCI-010 deterministic Estimate → NCI-012 Proposal.
