# Production Release Gate 1 — Production QA Checklist

> Scope: execute only after the pre-deploy environment audit, fresh backup, frozen release SHA, and one controlled deployment. Record PASS/FAIL plus evidence for every item. A P0 failure stops the release.

## Release evidence
- [ ] Frozen SHA matches the deployed application revision.
- [ ] Public Source Secret Safety succeeded on the frozen SHA.
- [ ] Command Center CI `verify` succeeded on the frozen SHA.
- [ ] `godaddy-root-build` succeeded on the frozen SHA.
- [ ] Fresh production DB backup timestamp/location recorded.
- [ ] Production Release Gate runtime checks passed before migrations.
- [ ] `prisma migrate deploy` completed successfully; no manual migration-table edits or hosted DB Import SQL used.

## P0 — Health, auth, routing
- [ ] `https://command.networkconnectit.com/api/health` responds successfully.
- [ ] Login works at `https://command.networkconnectit.com/` and auth redirects remain on the canonical `command.networkconnectit.com` host.
- [ ] Logout works and protected pages reject an unauthenticated session.
- [ ] SUPER_ADMIN and INTERNAL_ADMIN can access intended internal workflows.
- [ ] CLIENT_ADMIN is restricted to its tenant.
- [ ] VIEWER remains read-only.
- [ ] First-admin bootstrap is disabled and its token is absent.
- [ ] One-time recovery flags are disabled.

## P0 — Tenant isolation and direct-ID security
Use two test organizations (Tenant A and Tenant B). Never use real customer secrets as evidence.
- [ ] Tenant A cannot read or mutate Tenant B Site by direct ID.
- [ ] Tenant A cannot read or mutate Tenant B Project by direct ID.
- [ ] Cross-tenant Capacity paths reject access.
- [ ] Cross-tenant Survey Asset direct ID rejects access.
- [ ] Cross-tenant Work Order Evidence direct ID rejects access.
- [ ] Cross-tenant Closeout Package direct ID rejects access.
- [ ] Cross-tenant Bid Workspace direct ID rejects access.
- [ ] Cross-tenant Takeoff Workspace direct ID rejects access.
- [ ] Design Studio export enforces organization boundary and EXPORT permission.

## P0 — Client-safe commissioning exports
- [ ] Internal admin export retains approved internal operational fields.
- [ ] CLIENT_ADMIN export uses the customer-safe report profile.
- [ ] VIEWER export uses the customer-safe report profile.
- [ ] Customer copies do not expose vault/internal remote-access fields.
- [ ] Customer copies do not expose internal-only network/operations detail.
- [ ] Export authorization is enforced server-side, not only by UI.
- [ ] Print/Save-PDF output visually reviewed; record that V1 output is browser-print HTML unless/until binary PDF generation is implemented.

## P0 — Site Survey → Work Order → Closeout
- [ ] Create/assign a survey for the correct tenant/project/site.
- [ ] Start a survey session as the assigned field technician.
- [ ] Capture structured survey data and permitted photo evidence.
- [ ] Create/calibrate a floor-plan draft and place survey points.
- [ ] Approve the intended floor-plan revision and verify its snapshot/hash.
- [ ] Generate the Work Order from the approved revision.
- [ ] Assigned technician can access the Work Order; unrelated technician cannot.
- [ ] Record Pulled/Installed and Terminated stages.
- [ ] Record a FAIL test and verify completion is blocked.
- [ ] Record PASS and required evidence; verify completion can proceed.
- [ ] Create and resolve a punch-list item; open punch items block closeout.
- [ ] Record final acceptance.
- [ ] Generate a closeout package only after all required gates pass.
- [ ] Verify closeout package versioning/manifest and tenant-bound direct-ID access.

## P0/P1 — Commercial workflow
- [ ] Estimate can be created/updated for the intended project/tenant.
- [ ] Proposal is generated from the intended estimate.
- [ ] Scope, pricing, terms/exclusions and branding render correctly.
- [ ] Sent/approved proposal snapshot remains immutable/versioned.
- [ ] Verify actual proposal PDF behavior; do not mark NCI-012 complete if only browser printing exists.
- [ ] Verify proposal analytics event; keep NCI-012 open if missing.

## P0/P1 — Design Studio
- [ ] Open an existing Design Studio project/revision.
- [ ] Geometry edits save and reload correctly.
- [ ] Import/export path works without cross-tenant leakage.
- [ ] Design → Takeoff/BOM handoff works.
- [ ] Takeoff/BOM → Estimate → Proposal handoff works.
- [ ] Private asset storage upload/read path works.
- [ ] Existing QA asset remains intact.
- [ ] NCI-073 browser/iPad/performance checks completed on the production target.

## Runtime/data integrity
- [ ] Both NCI-074 migrations are recorded exactly once after deployment.
- [ ] Existing production projects/sites/users remain accessible.
- [ ] No demo seed was run and no demo dataset was introduced.
- [ ] No unexpected destructive schema/data changes observed.
- [ ] Private storage is server-side and healthy.
- [ ] MySQL transport/TLS requirement and actual production configuration are documented.

## Release decision
Gate 1 passes only when all P0 items pass, required evidence is retained, no unresolved security/data-integrity blocker remains, and known P1 gaps are explicitly classified as V1 blocker or post-V1.

If any P0 fails: stop opening access to users, preserve evidence, roll application code back to the recorded previous SHA when appropriate, and do not drop additive migration tables. Restore the DB only for a confirmed data-integrity incident after preserving the failed-state database.
