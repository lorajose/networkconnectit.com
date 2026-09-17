# NCI-073 — QA Test Data Plan

Use synthetic/non-sensitive QA data whenever possible.

## Minimum fixture

- Two organizations for tenant-isolation testing.
- At least one SUPER_ADMIN, INTERNAL_ADMIN, CLIENT_ADMIN and VIEWER test identity.
- One Design Studio project with two floors.
- Floor-plan files representing PDF, JPG and PNG imports.
- CCTV, access control, intrusion and network design objects.
- Multiple cameras with different optics plus at least one specialized/PTZ case.
- Cable routes with known expected distances after calibration.
- Existing manual takeoff rows before applying a design-derived proposal.
- An Estimate and Proposal link target.
- One private bid PDF for NCI-042.

## Large-project fixture

Before public release, define a repeatable larger fixture with recorded counts for floors, design objects, cameras, cable routes and devices. Reuse the same fixture for performance comparisons between release candidates.

Do not use real passwords, private customer bid documents, or production credentials as QA fixture data.