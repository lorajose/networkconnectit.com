# NCI-073 — QA Execution Order

Run in this order to fail fast and avoid spending time on UI tests when the environment is unsafe:

1. Candidate SHA + environment proof.
2. Migrations/runtime configuration.
3. Authentication and two-tenant security smoke.
4. Design Studio persistence/geometry smoke.
5. Layers/version history.
6. Design → Takeoff/BOM → Estimate → Proposal.
7. Internal/client-safe report and issued evidence.
8. NCI-042 private storage.
9. Full browser/iPad matrix.
10. Large-project performance benchmark.
11. P0 production-hardening review and release decision.

Any P0 security/data-loss/client-safe failure stops the release candidate immediately.