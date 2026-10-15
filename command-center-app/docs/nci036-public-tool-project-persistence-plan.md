# NCI-036 — Public Tool Project Persistence

## V1 contract
- Public estimator remains usable anonymously where intended.
- Tool output maps to a versioned, validated project-result contract.
- Save/Create Project requires authentication/organization context before persistence.
- Server derives tenant identity; browser output cannot choose organization IDs.
- First adapter targets Security Installation Estimator.
- Funnel analytics contain event/feature metadata only, not sensitive project content.

## QA
Anonymous flow, authenticated conversion, validation, duplicate/retry behavior, tenant isolation and analytics privacy.