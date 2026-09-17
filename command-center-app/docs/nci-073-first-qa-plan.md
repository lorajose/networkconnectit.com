# NCI-073 — First QA Execution Plan

## Phase A — deployment proof

- Identify the Node/Next application host used for Command Center.
- Deploy the exact approved candidate SHA.
- Record the deployed SHA and public QA URL.
- Confirm environment variables through host configuration without exposing secret values.
- Apply Prisma migrations.
- Confirm first-admin bootstrap is disabled after use.

## Phase B — security smoke

- SUPER_ADMIN login.
- CLIENT_ADMIN tenant isolation.
- VIEWER read-only behavior.
- Cross-tenant project/design/site/device/takeoff/export direct-ID attempts.

Stop and fix before continuing if any cross-tenant data is exposed or a forbidden write succeeds.

## Phase C — Design Studio functional smoke

- Two-floor test project.
- Import floor plan.
- Calibrate scale.
- Place/edit camera and inspect FOV/DORI.
- Create cable route and verify length.
- Create/reorder/lock layers and refresh.
- Save and restore a version.

## Phase D — commercial/report smoke

- Design-derived takeoff proposal → review → approve → apply.
- Verify manual rows preserved.
- Estimate/Proposal handoff.
- Internal report.
- Client-safe report with no pricing leakage.
- Issue/version report evidence.

## Phase E — NCI-042 private storage

- Upload source PDF.
- Confirm private persistence.
- Confirm evidence history and Estimate snapshot handoff.

## Phase F — compatibility/performance

- Safari / Chrome / Edge.
- iPad/tablet core workflow.
- Representative large-project fixture and recorded timings.

Only after these phases pass should the corresponding QA tickets be considered for Done.