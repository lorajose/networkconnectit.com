# Legacy Alert migration reconciliation

Evidence reviewed 2026-10-16: owner-supplied SQL export of `_prisma_migrations` and `CREATE TABLE Alert`; main baseline cea422dd3bda943a3e35d3b2ae6aeb576b0237ed.

The export contains 32 records: 27 applied and 5 rolled back. All 26 applied migration files present in main match their recorded SHA-256 checksums. Eleven source-controlled migrations remain pending in that export. The historical Alert alignment SQL is absent from the available repository history, deployed preview and searched local directories. The original SQL cannot be reconstructed from its checksum.

The two reviewed Alert history records are explicitly pinned by id, checksum, state and applied-step count in `scripts/legacy-alert-history.mjs`. The applied record has zero steps because it was marked applied; the export alone does not prove its SQL ran. Consequently, recognition also requires read-only live metadata checks of all Alert column types/nullability/text collations, ordered indexes including uniqueness and prefixes, and foreign-key targets/delete/update rules. Unknown histories and schema drift block startup. The legacy severity default MEDIUM is retained; Prisma has no declared severity default. This change does not assert complete database/schema equivalence.

No migration.sql with fabricated contents is added. No migration history row is deleted, rewritten or resolved. No production database operation has been executed by this change. Fresh databases without this legacy history retain the normal migration path; the exception is only evaluated when the legacy migration name is present. This does not restore the missing SQL needed to replay that historical migration in isolation.

Validation: history tests reject unknown checksums/ids, unresolved failures, missing/duplicate records and a different migration name. A guarded disposable CI MySQL fixture uses the supplied Alert DDL, accepts its metadata, and rejects missing-index, altered-column and missing-foreign-key cases. The MySQL fixture refuses non-CI, non-localhost or non-test database URLs.

Deployment remains conditional on real CI PASS and runtime gates. Preview and Published share the hosted database; updating Preview can apply the pending migrations. Owner reports an SQL backup export, but restore has not been tested. A complete production drift/restore rehearsal is separate from this history reconciliation.
