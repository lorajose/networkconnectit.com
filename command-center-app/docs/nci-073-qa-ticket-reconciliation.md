# NCI-073 — QA Ticket Reconciliation Matrix

Snapshot prepared after NCI-065 clean merge. This matrix prevents implementation-complete tickets from being confused with target-environment QA-complete tickets.

| Ticket | Current release treatment | Evidence still required before Done |
| --- | --- | --- |
| NCI-042 Estimating workspace / bid intake | QA | Configure persistent private storage; create bid; upload source PDF; verify evidence/revision; link Estimate; snapshot handoff. |
| NCI-043 Digital takeoff / BOM capture | QA | Runtime takeoff edits/import and BOM persistence; verify design-approved rows and manual rows coexist. |
| NCI-044 Scope gap / assumption / risk analyzer | QA | Runtime validation with representative bid evidence and expected risk output. |
| NCI-050 2D canvas | QA | Browser runtime create/edit/save/refresh with representative project. |
| NCI-051 Floor plan import | QA | PDF/JPG/PNG import cases on deployed QA. |
| NCI-052 Scale/walls/obstacles | QA | Known-distance scale calibration and persisted geometry checks. |
| NCI-053 Device catalog | QA | Runtime catalog/custom-device create/select/persistence. |
| NCI-054 Manufacturer data research | QA | Validate provenance/licensing architecture evidence; do not treat unlicensed scraped data as production catalog. |
| NCI-055 Camera FOV | QA | Known optics/FOV cases plus move/edit persistence. |
| NCI-056 DORI/pixel density | QA | Overlay units/thresholds and persisted report evidence. |
| NCI-057 IR/PTZ/specialized simulation | QA | Runtime specialized-camera scenarios. |
| NCI-058 Cable route planner | QA | Known-scale route length and edit/restore checks. |
| NCI-059 IP/network planner | QA | Runtime segment/address plan create/edit/persist and collision/validation cases. |
| NCI-060 Generated topology | QA | Generate/update topology and confirm source design remains authoritative. |
| NCI-061 Multidisciplinary layers | QA | Visibility, lock, reorder, assignment, autosave, restore and export-profile runtime checks. |
| NCI-062 Design → Takeoff/BOM/Cost | QA | Review → approve → apply runtime flow; traceability; manual-row preservation; Estimate handoff. |
| NCI-063 Autosave/version history | QA | Save/refresh/restore and version-chain runtime tests. |
| NCI-064 Collaboration/permissions | QA | Two-tenant and multi-role runtime direct-ID/write/export tests. |
| NCI-065 Branded reports | QA | Internal/client-safe runtime exports, branding, immutable issued evidence and Estimate/Proposal links. |
| NCI-073 Master QA | Ready | All NCI-073 functional/security/performance/browser gates plus P0 release blockers cleared. |

## P0 release blockers outside the Design Studio QA cluster

NCI-021, NCI-031, NCI-032 and NCI-033 remain release gates. They should not be silently closed by the Design Studio merge. Their target-environment/client-safe acceptance must be demonstrated separately.

## Rule

A green CI run is necessary but not sufficient for **Done**. The exact deployed candidate must satisfy the applicable runtime acceptance evidence.