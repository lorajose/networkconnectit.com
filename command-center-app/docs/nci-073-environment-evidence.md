# NCI-073 — Environment Evidence Checklist

Capture values as PASS/FAIL or redacted metadata; never paste secrets.

- [ ] QA public URL recorded.
- [ ] Deployed Git SHA recorded and matches candidate.
- [ ] Node runtime version recorded.
- [ ] Database engine/environment identified.
- [ ] `prisma:migrate:deploy` completed.
- [ ] `NEXTAUTH_URL` path alignment verified.
- [ ] `NEXT_PUBLIC_APP_BASE_PATH` alignment verified.
- [ ] `NEXTAUTH_SECRET` present/non-placeholder (value not recorded).
- [ ] First-admin bootstrap disabled after use.
- [ ] NCI-042 storage driver recorded.
- [ ] Private storage persistence/writability verified without recording secret credentials.
- [ ] No demo seed used in a real customer/production database.
