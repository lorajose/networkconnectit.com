# NCI-048 — Estimated vs Actual Project Cost Tracking

## MVP
- Freeze baseline from the accepted estimate version.
- Capture practical actual labor hours/cost and material quantity/cost with source/date/user.
- Show baseline, actual-to-date, variance and projected margin without becoming an accounting ledger.
- Corrections are append/audit aware; historical accepted-estimate pricing stays immutable.
- Tenant/project scope is server authoritative.

## Integration
Reuse estimate/pricing contracts and NCI-045 price evidence. Do not create a second pricing engine.

## QA
Baseline immutability, variance math, permissions, cross-tenant denial, corrections and audit evidence.