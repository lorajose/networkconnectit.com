# NCI-073 — NCI-042 Private Bid Storage Evidence

- Candidate SHA:
- Storage driver: filesystem / supabase
- Environment: QA / staging

Checks:

- [ ] Create tenant-scoped bid workspace.
- [ ] Upload permitted PDF/source file.
- [ ] File metadata/revision appears in bid history.
- [ ] Binary persists after application restart/redeploy behavior expected for the selected driver.
- [ ] File is not exposed from public application/static paths.
- [ ] Cross-tenant direct-ID/download attempt fails closed.
- [ ] Link Estimate.
- [ ] Create evidence snapshot.
- [ ] Snapshot references intended source/revision.
- [ ] Handoff succeeds without deleting/replacing unrelated manual evidence.

Never store the real service-role key, database credentials, private customer source document, or raw private storage path in this evidence file.