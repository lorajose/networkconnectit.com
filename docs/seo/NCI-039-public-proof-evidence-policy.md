# NCI-039 Public Proof Evidence Policy

## Purpose
NetworkConnectIT public pages must communicate capability without publishing proof claims that cannot be independently supported.

## Release rule
A quantitative customer, project, uptime, response-time, review, rating, certification, backup, monitoring, or availability claim must have a documented source of truth before it can be released.

## Approved evidence
Examples of acceptable evidence include:
- completed project records or invoices that can be reconciled to the published count;
- CRM/customer records with a defined counting method and date;
- first-party review records or an attributable third-party review source;
- current credential or license records identifying the holder and scope;
- signed service agreements for response-time or coverage commitments;
- operational monitoring records supporting a monitoring-coverage statement;
- documented storage architecture and contractual scope for CCTV retention or backup statements.

## Claims without evidence
Until evidence exists, public copy must use non-quantitative capability language. Examples:
- `Commercial project experience` instead of an unsupported project count.
- `Customer-focused field support` instead of an unsupported customer count.
- `Priority support options with response targets defined by agreement` instead of an unconditional response guarantee.
- `Proactive monitoring options based on the agreed support scope` instead of unconditional 24/7 monitoring.
- `Resilience planning with redundancy and failover options` instead of zero-downtime language.
- `CCTV retention and backup planning based on project requirements` instead of unconditional cloud-backup custody claims.

## Reviews and ratings
Do not publish fabricated, reconstructed, or self-serving aggregate ratings as structured data. Reviews displayed publicly must be attributable and handled transparently. Review markup must follow the applicable search-engine structured-data policies.

## Security and privacy
Authenticated Command Center surfaces remain protected by application authentication. Search-engine directives such as `noindex` are defense-in-depth controls and are not an access-control mechanism.

## Quality gate
CI is expected to fail when unsupported proof counters or high-risk absolute promises are present. The correct remediation is to document evidence or rewrite/remove the claim; bypassing the quality gate is not an acceptable release path.

## Ownership
This policy applies to Homepage, Services, Pricing, About, Blog, Testimonials, Tools, Command Center marketing surfaces, metadata, Open Graph copy, structured data, and future landing pages.