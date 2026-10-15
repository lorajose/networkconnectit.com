# NCI-037 — Release Operations Checklist

## Automated / source gate
- [x] Structured audit primitive exists.
- [x] Sensitive audit metadata keys are filtered.
- [x] Runtime error primitive avoids error messages/stacks.
- [x] Health endpoint is non-cacheable and contains no configuration secrets.
- [x] Backup/retention/restore policy is documented.
- [x] Restore evidence template exists.

## Environment QA gate
- [ ] Confirm hosting runtime captures structured JSON logs.
- [ ] Configure and verify production alert destination.
- [ ] Confirm automated MySQL backup schedule and encryption/retention settings.
- [ ] Execute isolated non-production restore from an approved backup.
- [ ] Record restore evidence and PASS result.

NCI-037 must remain QA until the environment evidence above is complete. NCI-033/NCI-074 remain the production release authority.
