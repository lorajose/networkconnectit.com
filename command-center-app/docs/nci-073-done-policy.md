# NCI QA → Done Policy

For implementation tickets in the NCI-042/NCI-043/NCI-044 and NCI-050–NCI-065 QA cluster:

1. Code merged to `main` is implementation evidence, not automatically Done evidence.
2. Automated CI/build/security must be green for the exact release candidate.
3. Ticket-specific runtime acceptance must pass in the target QA environment when the acceptance criterion depends on browser behavior, persistence, external storage, tenant isolation, deployment, report rendering, or end-to-end workflow.
4. Any release-blocking defect keeps the affected ticket in QA.
5. Notion status should be updated only after evidence exists; include the candidate SHA/environment/date in the ticket update.

NCI-073 is the aggregate release gate and remains Ready/In Progress until the complete release evidence set is available.