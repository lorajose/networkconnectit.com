# NCI-073 — QA/Production Rollback Requirements

Before automating Command Center production deployment, verify a rollback process that can:

- identify the currently deployed Git SHA;
- redeploy the last approved application SHA;
- preserve/restore compatible environment configuration;
- handle database migration compatibility without destructive ad-hoc rollback;
- restart the Node application cleanly;
- verify login, tenant isolation and a read-only smoke test after rollback.

Database schema changes require special care: prefer forward-fix migrations. Never assume reverting application code also reverses an already-applied Prisma migration safely.