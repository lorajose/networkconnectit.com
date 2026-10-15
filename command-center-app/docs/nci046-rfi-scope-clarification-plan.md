# NCI-046 — RFI & Scope Clarification Generator

## MVP
- Generate editable draft RFIs only from user-selected scope gaps/ambiguities.
- Preserve links to project, source document/sheet, evidence and estimate version.
- Lifecycle: DRAFT → SENT → ANSWERED/CLOSED.
- Answers never mutate assumptions or estimate inputs automatically; user confirmation creates a traceable update.
- Generated wording must distinguish source facts from inferred questions.

## QA
Source linkage, version integrity, permissions, tenant isolation, status transitions and explicit-confirmation enforcement.