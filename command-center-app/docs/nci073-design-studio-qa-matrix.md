# NCI-073 Design Studio QA Matrix

This document is release evidence, not a product-support promise. Only implemented formats may be marked supported.

## Geometry

Automated regressions must remain green for camera FOV, DORI/PPM, calibrated scale, and cable-route length. The NCI-073 composition test exercises those engines together. Large geometry calculation has an explicit CI benchmark budget.

## Import

| Format | Current support | QA evidence |
| --- | --- | --- |
| PDF floor plan | Supported | MIME, extension, magic bytes, PDF end marker, active/encrypted-content rejection |
| PNG floor plan | Supported | MIME, extension and magic-byte validation |
| JPEG floor plan | Supported | MIME, extension and magic-byte validation |
| DXF | Not implemented | Must not be represented as supported until a dedicated implementation ticket lands |

## Export

Design Studio/report and topology export paths must retain their existing regression coverage. Portable SVG topology output is directly unit tested. CSV/JPG/PDF export workflows are product surfaces that require functional/browser validation before NCI-073 can close.

## Security

NCI-073 requires the existing tenant, RBAC, direct-ID, private-asset and collaboration regressions to pass on the exact release head. CI success is necessary but does not replace target-environment smoke testing where specified by the production gate.

## End-to-end

Before closure, validate:
Design Studio → reviewed Takeoff/BOM → Estimate → Proposal.

The handoff must remain human-reviewed where the product contract requires approval; QA must not silently bypass that control.

## Browser/device execution

Before closure, record real execution for:
- Chrome desktop
- Edge desktop
- Safari desktop
- iPad Safari

For each target record release SHA, OS/browser version, tester/date, result and defects. Automated unit tests do not substitute for this evidence.
