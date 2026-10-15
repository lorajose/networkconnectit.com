# NCI-030 — Immutable Professional Proposal / Closeout PDFs

## Selected V1 strategy
Use a controlled server-side document snapshot as the only input to PDF rendering.

The application first creates a canonical, version-bound snapshot containing:
- document kind and audience,
- organization branding,
- document number/title,
- source proposal/package version,
- fixed generation timestamp,
- client-safe payload,
- SHA-256 snapshot hash.

The renderer contract is `CONTROLLED_SERVER_HTML_TO_PDF`. Browser print remains a convenience preview only and is not the authoritative sent/generated artifact path.

## Reproducibility
Canonical JSON recursively sorts object keys before hashing. The same frozen source version, metadata and payload therefore produces the same snapshot hash. Changing the source version changes the hash and output filename. A generated artifact can be verified against its frozen snapshot with `verifyProfessionalDocumentSnapshot`.

## Client-safe policy
The NCI-030 ticket references NCI-019, but NCI-019 is the cPanel/public-root hardening ticket. The actual client-safe export controls are NCI-021 and NCI-031.

NCI-030 therefore carries forward those completed controls:
- CUSTOMER_COPY removes internal project ownership;
- remote-access metadata is omitted;
- subnet values are redacted and gateway values removed;
- access references/vault paths are omitted;
- device port identifiers/notes are removed;
- secret-like fields are never serialized into professional document snapshots.

Tenant and role authorization remain the responsibility of the existing server-side export/read services before a snapshot is built.

## Branding and metadata
Snapshots support company name, logo URL, tagline, website, phone and email plus immutable document metadata. Proposal snapshots inherit proposal branding; closeout snapshots accept the organization branding already loaded by the tenant-scoped closeout reader.

## Storage boundary
NCI-030 defines the immutable snapshot/render contract. Durable private binary storage or signed client sharing is handled by the existing private-storage architecture and NCI-066 respectively. No public-web-root PDF storage is introduced here.
