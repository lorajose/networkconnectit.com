# NCI-073 — QA Defect Severity

Use these release-focused severities when runtime QA finds defects.

- **P0 / Release blocker:** cross-tenant exposure, unauthorized write/export, credential/secret exposure, data loss/corruption, migration failure, authentication bypass, client-safe pricing/internal-data leak, application cannot start.
- **P1 / Must fix before broad release:** core Design → Takeoff/BOM → Estimate/Proposal flow broken, report issue/version evidence broken, major geometry/calculation error, major supported-browser workflow unusable.
- **P2 / Can be scheduled with explicit acceptance:** non-destructive workflow friction, isolated visual defect, non-critical empty-state/report formatting issue.
- **P3 / Improvement:** polish, copy, low-impact convenience or optimization.

NCI-073 cannot be Done with an unresolved P0. Any accepted P1/P2 exception must be explicit and linked to a ticket; do not silently waive it.