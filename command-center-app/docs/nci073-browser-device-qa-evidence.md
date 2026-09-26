# NCI-073 Design Studio Browser / Device QA Evidence

Use this sheet only against the exact release candidate SHA being evaluated. Do not mark NCI-073 complete from automated CI alone.

## Release identity

- Release candidate SHA:
- Environment / URL:
- Tester:
- Test date:
- Build / deployment reference:

## Browser and device matrix

| Target | OS / device | Browser version | Login + navigation | Design Studio interaction | Save / reload | Result | Defects / evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Chrome desktop |  |  |  |  |  | PENDING |  |
| Edge desktop |  |  |  |  |  | PENDING |  |
| Safari desktop |  |  |  |  |  | PENDING |  |
| iPad Safari |  |  |  |  |  | PENDING |  |

For every target, exercise zoom/pan, selection, device placement, cable-path editing, calibrated scale, layer visibility/locking, and a save/reload cycle. Record any layout, pointer/touch, scrolling, focus, modal, or persistence defect.

## Import validation

| Format | Expected | Result | Evidence / defect |
| --- | --- | --- | --- |
| PDF | Supported | PENDING |  |
| PNG | Supported | PENDING |  |
| JPEG | Supported | PENDING |  |
| DXF | Not implemented; must not be represented as supported | PENDING |  |

Confirm invalid/mismatched uploads fail safely and private source assets are not exposed through a public URL.

## Export validation

| Export surface | Result | Evidence / defect |
| --- | --- | --- |
| CSV | PENDING |  |
| JPG | PENDING |  |
| PDF | PENDING |  |
| Topology / SVG where exposed | PENDING |  |

Open/download each produced artifact and verify it is readable, belongs to the current tenant/project, and does not expose internal-only economics or another tenant's data.

## End-to-end reviewed handoff

Execute the product flow with a non-demo organization and representative project:

Design Studio → reviewed Takeoff/BOM → Estimate → Proposal

- Design created and saved: PENDING
- Takeoff/BOM generated from the intended design revision: PENDING
- Human review/approval required and recorded: PENDING
- Estimate reflects approved scope: PENDING
- Proposal reflects reviewed estimate: PENDING
- Customer-facing proposal does not expose internal cost/margin fields: PENDING
- Direct-ID / cross-tenant negative check: PENDING

## Closure rule

NCI-073 may be marked complete only when:
1. the exact candidate SHA has green required CI;
2. all four browser/device targets above have real execution evidence;
3. CSV/JPG/PDF functional export validation is recorded;
4. the reviewed Design → Takeoff/BOM → Estimate → Proposal flow passes;
5. no unresolved release-blocking defect remains.

If any row fails, record the defect and keep NCI-073 open until the fix is promoted and the affected evidence is rerun against the new exact SHA.
