# NCI-073 — Immediate Stop Conditions

Stop the release candidate and open/fix a blocker if QA observes any of the following:

- cross-tenant data disclosure;
- unauthorized create/update/delete/export;
- password, token, credential or secret exposure;
- CLIENT_SAFE pricing/internal-data leakage;
- destructive migration or unrecoverable data loss;
- design autosave/version restore corrupts source state;
- Design → Takeoff/BOM approval corrupts or deletes unrelated manual rows;
- private bid document becomes publicly addressable;
- production/QA app cannot authenticate reliably because URL/base-path configuration is inconsistent.

Resume only with a new/fixed candidate SHA and rerun the affected upstream gates.