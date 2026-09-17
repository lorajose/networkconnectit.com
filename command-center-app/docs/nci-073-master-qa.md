# NCI-073 — Design Studio Master QA Gate

This document is the release gate for Design Studio. A ticket may remain in QA while its automated checks pass; **Done** requires the applicable runtime evidence below.

## Baseline under test

- Main baseline at QA activation: `1a710a3201d2f7396e1130683ed93d1f107bc44a` (NCI-065 clean merge).
- `npm run verify:ci` must pass on the exact candidate SHA.
- GoDaddy-style root build and standalone artifact verification must pass on the exact candidate SHA.
- Public source secret-safety workflow must pass when triggered for the candidate change.

## Environment gate

Before functional QA:

- `DATABASE_URL` points to the QA database.
- `NEXTAUTH_SECRET` is long, random, non-placeholder.
- `NEXTAUTH_URL` matches the public QA auth endpoint.
- `NEXT_PUBLIC_APP_BASE_PATH` matches the deployed path, if path-mounted.
- `ENABLE_FIRST_ADMIN_BOOTSTRAP=false` after bootstrap.
- Run `npm run prisma:migrate:deploy` before starting the candidate.
- Run `npm run verify:staging` against the candidate.
- For NCI-042 filesystem storage, set `BID_PRIVATE_STORAGE_ROOT` to an absolute, persistent, writable path outside the public web root. If the host filesystem is not persistent, use the private Supabase storage driver instead.

## Functional Design Studio gate

For one tenant project with at least two floors:

- Import PDF, JPG, and PNG floor-plan cases and verify rendering after refresh.
- Calibrate scale and verify a known measurement.
- Draw/edit walls and obstacles; verify persisted geometry after refresh/version restore.
- Place cameras and verify FOV geometry updates while moving/editing.
- Verify DORI / pixel-density overlays and units.
- Create cable routes and verify calculated length from calibrated geometry.
- Create/edit multidisciplinary layers; verify visibility, lock, reorder, assignment, autosave and restore.
- Verify CCTV, access control, intrusion and network objects remain on their assigned disciplines/layers.
- Generate/update topology from design connections without corrupting source design objects.

## Commercial handoff gate

- Generate a design-derived takeoff proposal.
- Review the diff before approval.
- Approve and apply it to the existing NCI-043 takeoff/BOM contract.
- Confirm manual takeoff rows are preserved.
- Confirm approved design rows retain source design IDs and reviewer/time evidence.
- Continue Takeoff/BOM → Estimate → Proposal and verify quantities remain traceable.

## Report / client-safe gate

- Generate an INTERNAL design report with the requested sections/layers.
- Generate a CLIENT_SAFE report and confirm hidden pricing is absent.
- Verify cover/floor summary, camera coverage, BOM and cable schedule composition.
- Verify organization branding/contact data.
- Issue a report and verify immutable/versioned evidence, integrity digest and previous-version chain.
- Verify issued evidence can retain Estimate/Proposal references.
- Verify commissioning exports never print raw credentials/secrets.

## Security / tenant gate

Test with SUPER_ADMIN, INTERNAL_ADMIN, CLIENT_ADMIN and VIEWER:

- Cross-tenant direct IDs fail closed for projects, designs, sites, devices, takeoff and exports.
- VIEWER cannot mutate design/takeoff records.
- Design VIEW / EDIT / EXPORT permissions are enforced server-side.
- Organization-bound project/design sharing cannot escape tenant boundaries.
- Client-safe report rules cannot be bypassed by direct request parameters.

## Performance and compatibility gate

- Define a representative large-project fixture before public release; record floor count, object count, cable-route count and device count.
- Record load, edit, autosave and report-generation timings for that fixture.
- No data loss or browser crash during the benchmark.
- Validate current desktop Safari, Chrome and Edge.
- Validate the core field workflow on iPad/tablet: open project, navigate floor, place/edit object, cable route, save/refresh, and open report preview.

## NCI-042 private bid-document QA

- Create a bid workspace.
- Upload a PDF/source document to private storage.
- Confirm revision/evidence history.
- Link an Estimate.
- Snapshot evidence and confirm handoff succeeds.
- Confirm uploaded binary is not publicly addressable from the application web root.

## Release decision

NCI-073 can move to **Done** only when:

1. exact-candidate automated CI/build/security gates are green;
2. all applicable functional, commercial, report and tenant checks above pass in the deployed QA environment;
3. performance/browser/iPad evidence is recorded; and
4. no P0 production-hardening blocker remains open for the intended release scope.

Record failures as separate defects/tickets; do not mark the parent implementation ticket Done while a release-blocking failure remains.