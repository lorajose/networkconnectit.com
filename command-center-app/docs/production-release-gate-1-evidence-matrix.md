# Production Release Gate 1 — Blocker Evidence Matrix

**Rule:** PASS requires the evidence named below. Code present or a green build alone does not satisfy a production-runtime check. FAIL on any P0 release blocker stops opening access to users. PENDING is not PASS.

| Ticket / area | Gate | Current state | Evidence required for PASS |
|---|---|---|---|
| Release SHA / CI | P0 | PENDING | Frozen SHA equals deployed SHA; Secret Safety, verify and godaddy-root-build green on that exact SHA |
| NCI-033 Environment | P0 | PENDING-RUNTIME | Production release gate exits 0 using production env; no secret values captured in evidence |
| NCI-033 Backup | P0 | PENDING-RUNTIME | Fresh pre-deploy DB backup with timestamp/location and previous app SHA recorded |
| NCI-033 Migrations | P0 | PENDING-RUNTIME | Before deploy, both NCI-074 migrations absent; after deploy, each recorded exactly once via prisma migrate deploy |
| NCI-033 Recovery/bootstrap | P0 | PENDING-RUNTIME | Bootstrap disabled/token absent; NCI_RECOVER_NCI049 and NCI_RECOVER_ALERT_SCHEMA disabled |
| NCI-033 DB/TLS | P0 | PENDING-RUNTIME | Production DB endpoint/config verified and provider transport/TLS requirement documented |
| Private storage | P0 | PENDING-RUNTIME | Config gate passes; upload/read test succeeds without public/service-role leakage |
| NCI-021 / NCI-031 Client-safe exports | P0 | CODE-EVIDENCE | Runtime CLIENT_ADMIN/VIEWER customer-safe export plus internal export; forbidden fields absent |
| NCI-032 Tenant/RBAC | P0 | CODE-EVIDENCE | Cross-tenant direct-ID runtime attempts rejected for Site, Project, Capacity, Survey Asset, WO Evidence, Closeout, Bid, Takeoff and Design export |
| NCI-012 Proposal | P0 | PARTIAL | Estimate→Proposal runtime path, branding/scope/pricing/terms, immutable sent snapshot; separately record PDF and analytics gaps |
| NCI-015 Closeout | P0 | PARTIAL | Completed WO + evidence + no open punch + accepted final acceptance → versioned closeout package; cross-tenant access rejected |
| NCI-013 Site Survey V1 | V1 | PARTIAL | Assigned technician completes mobile/structured/photo survey linked to project/site; floor-plan handoff works |
| NCI-014 Work Order V1 | V1 | PARTIAL | Assigned technician stage updates; FAIL blocks completion; PASS + required evidence permits completion |
| NCI-042 Estimating Workspace | P1/V1 | QA | Production smoke of bid intake/workspace and tenant boundary |
| NCI-043 Takeoff/BOM | P1/V1 | QA | Production takeoff/BOM capture and handoff |
| NCI-044 Risk Analyzer | P1/V1 | QA | Production scope-gap/assumption/risk flow with intended authorization |
| NCI-050 Design Canvas | P0 | QA | Production create/edit/save/reload |
| NCI-051 Floor-plan import | P0 | QA | Production PDF/JPG/PNG import with private asset handling |
| NCI-052 Geometry/scale | P0 | QA | Calibration, grid/walls/obstacles produce stable saved geometry |
| NCI-055 Camera FOV | P0 | QA | FOV geometry renders/saves correctly on production target |
| NCI-058 Cable routing | P0 | QA | Route/length calculation works and persists |
| NCI-061 Design layers | P0 | QA | CCTV/access/intrusion/network layer behavior verified |
| NCI-062 Design→BOM/cost | P0 | QA | Quantities reach Takeoff/BOM/cost engine without tenant leakage |
| NCI-063 Autosave/versioning | P0 | QA | Autosave + version restore validated without data loss |
| NCI-065 Design report/proposal sections | P0 | QA | Branded output sections render correctly; limitations recorded |
| NCI-073 Design Studio QA | P0 | PENDING-PRODUCTION | Functional, security, supported-browser/iPad and performance checks on production target |
| NCI-074 Consolidated gate | P0 | IN PROGRESS | Every P0 above PASS; P1 gaps classified; evidence retained; release decision recorded |

## Evidence record template

For each row record:
- **Result:** PASS / FAIL / PENDING
- **Environment:** production URL/path and tenant/test account role (never passwords/tokens)
- **Release SHA:** exact 40-character SHA
- **Timestamp:** local/UTC timestamp
- **Action:** concise test performed
- **Observed result:** what actually happened
- **Evidence:** workflow run ID, sanitized log excerpt, screenshot reference, DB migration names/count, or test artifact
- **Defect:** ticket/issue if FAIL
- **Retest:** timestamp + evidence after correction

## Stop conditions
Immediately stop release progression for: migration inconsistency; failed backup; tenant crossover; unauthorized direct-ID access; unsafe customer export; bootstrap/recovery mode active; failed production release gate; data-integrity loss; inability to identify the deployed SHA.

## Release authorization
NCI-074 may move out of the release gate only after all P0 rows are PASS. P1 items that remain open require an explicit documented post-V1 classification and must not undermine a P0 path. No row becomes PASS from source inspection alone when runtime evidence is required.
