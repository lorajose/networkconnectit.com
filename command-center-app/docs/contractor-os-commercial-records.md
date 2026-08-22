# Contractor OS Commercial Records

This document defines the persistence contract for Estimate and Proposal records before the database migration is applied.

## Tenant boundary
Every commercial record belongs to exactly one `organizationId`. Project-linked records also carry `projectInstallationId`. Reads and writes must apply the same tenant policy used by Command Center inventory.

## Estimate
- `id`
- `organizationId`
- `projectInstallationId`
- `estimateNumber`
- `status`: DRAFT | READY | SENT | APPROVED | REJECTED | EXPIRED
- deterministic cost-engine snapshot
- customer sell subtotal, tax, total
- protected internal direct cost, burden, contingency, gross profit and margin
- created/updated timestamps

## EstimateLine
- estimate id
- type, description, quantity, unit
- unit cost and unit sell price
- taxable flag
- stable display order

## Proposal
- `id`
- `organizationId`
- `projectInstallationId`
- source `estimateId`
- `proposalNumber`
- current version
- commercial lifecycle status
- current customer-facing snapshot
- sent/viewed/approved/rejected timestamps

## ProposalVersion
A proposal version is immutable after creation. It stores the exact scope, customer-visible line items, terms, warranty, branding, subtotal, tax and total shown to the customer. A changed snapshot creates a new version.

## ApprovalReceipt
Approval always points to an immutable proposal version and records signer identity, approval timestamp and the exact customer total. An approved proposal cannot be silently reopened; changes require a new draft/version.

## Safety rule
Internal cost, labor burden, contingency and margin are never copied into the customer-facing proposal snapshot or approval receipt.
