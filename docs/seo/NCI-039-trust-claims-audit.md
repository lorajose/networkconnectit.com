# NCI-039 — SEO Trust, Claims, and Structured Data Audit

Status: In progress
Date: 2026-08-29
Scope: Public NetworkConnectIT marketing site and Command Center discovery surfaces.

## Quality standard

Public SEO content must be accurate, supportable, visible to users, and consistent with the actual service being offered. Security and authentication controls must never rely on crawler directives.

The release standard for NCI-039 is conservative by design: if a public claim cannot be supported by current evidence, current operational capability, or a clearly defined customer agreement, it must be removed or rewritten before release. Search visibility is never a justification for overstating capability.

## High-priority findings

### 1. Homepage AggregateRating

Current homepage JSON-LD contains an `AggregateRating` with `ratingValue: 4.9` and `reviewCount: 48`.

Decision: remove this markup from the NetworkConnectIT LocalBusiness schema. Do not amplify or duplicate this rating elsewhere. A future review program must use real customer feedback, transparent sourcing, and search-engine-compliant structured data.

Release status: **BLOCKED until removed**.

### 2. Service-plan claims

Current public copy and/or structured data includes strong operational promises such as:

- 24/7 monitoring or engineer availability
- guaranteed or priority response windows
- cloud CCTV backup
- monthly security audits
- dual-ISP failover
- dedicated technician coverage
- zero-downtime language

Decision: treat these as high-risk commercial claims until service scope, staffing model, operational capability, exclusions, escalation path, tooling, and customer terms are confirmed. Do not strengthen them in metadata or structured data during NCI-039.

Release status: **REWRITE OR SUBSTANTIATE**.

### 3. Project-count and client-count claims

Current public pages contain labels such as `25 Created Projects` and `20 Happy Clients`.

Decision: numerical proof claims require a documented source of truth. If a defensible project/client ledger is not available for the exact numbers and definitions used, replace these counters with non-numeric capability statements.

Release status: **REWRITE OR SUBSTANTIATE**.

### 4. Certification and licensing language

Current pages use phrases such as `Cisco Certified`, `Cisco/UniFi certified experts`, and related credential language.

Decision: credential claims may remain only when they accurately describe current, verifiable individual credentials and do not imply a vendor partnership, employer endorsement, company-level certification, reseller status, or program membership that does not exist. Exact wording must distinguish individual professional credentials from company/vendor relationships.

Release status: **VERIFY WORDING**.

### 5. Public/private Command Center boundary

The public `/tools/command-center/` product landing is intended for discovery. Authenticated application routes must be protected by application authentication and emit `noindex` metadata. `robots.txt` is crawler guidance only and is not a security boundary.

Release status: **PASS at current baseline**. Authentication remains the security control; `noindex` is defense in depth.

## Evidence and release matrix

| Public claim | Current locations observed | Risk | Release decision |
| --- | --- | --- | --- |
| `AggregateRating` 4.9 / 48 | `index.html` JSON-LD | High — search policy / trust | Remove before merge |
| 24/7 monitoring / telemetry | `index.html`, `service.html`, `feature.html`, `pricing.html`, `about.html`, `testimonial.html`, `contact.html` | High — operational promise | Rewrite unless monitoring coverage and staffing are documented |
| 4h / guaranteed response | `index.html`, `service.html`, `pricing.html` | High — SLA / contractual | Remove guarantee unless contract, clock definition, severity definition, coverage window, and exclusions exist |
| Cloud CCTV backups | `index.html`, `service.html`, pricing metadata/content | High — data custody / security | Rewrite unless supported architecture, retention, access control, encryption, ownership, and recovery process are documented |
| Dedicated technician | `index.html`, `service.html`, `pricing.html` | Medium-high — staffing promise | Rewrite unless assignment model and availability are defined |
| Zero-downtime / operations never stop | homepage and supporting pages | High — absolute performance claim | Replace with resilience-oriented wording; never promise zero downtime |
| 25 Created Projects / 20 Happy Clients | homepage and supporting pages | Medium-high — quantitative proof | Keep only with documented source of truth; otherwise remove numeric counters |
| Cisco / CCNA / CCNP / Cisco Specialist | homepage credential sections and metadata | Medium — credential accuracy | Use exact current individual credential names; avoid implying Cisco partnership |
| UniFi certification language | homepage and supporting pages | Medium — credential accuracy | Verify exact credential/program status; otherwise use `UniFi deployment experience` |
| NY security/fire alarm installer licensing language | homepage credential section | High — regulated credential | Verify exact license type, holder, status, and permitted representation before release |
| CCTV installation | public service pages | Low when actually offered | Approved baseline capability |
| Access control installation | public service pages | Low when actually offered | Approved baseline capability |
| Structured cabling | public service pages | Low when actually offered | Approved baseline capability |
| Network infrastructure deployment | public service pages | Low when actually offered | Approved baseline capability |
| Rack builds / cable management | public service pages | Low when actually offered | Approved baseline capability |
| Field technician / subcontractor support | homepage, partner support, tools | Low when actually offered | Approved baseline capability |
| Multi-site rollout support | public service pages | Low when actually offered | Approved baseline capability |

## Approved wording patterns

Prefer language that describes capability and process rather than guaranteed outcomes. Examples:

- Prefer `proactive monitoring options` over `24/7 monitoring` unless continuous coverage is contractually and operationally supported.
- Prefer `priority support options` over `guaranteed response under 4 hours` unless a formal SLA exists.
- Prefer `resilient design with redundancy and failover options` over `zero downtime`.
- Prefer `CCTV retention and backup options based on project requirements` over an unconditional `cloud CCTV backups` claim.
- Prefer `experienced network and security field support` over broad vendor-certification language when the exact credential holder is not stated.
- Prefer `individual Cisco credentials include ...` when exact, current credentials have been verified.

## Approved SEO claims for the current baseline

These service descriptions are suitable for the baseline when they reflect actual offered work:

- CCTV installation
- access control installation
- structured cabling
- network infrastructure deployment
- cable management
- rack builds
- field technician support
- multi-site rollout support
- commercial installation/subcontractor support

Geographic claims must match actual service availability and should not be expanded solely for ranking purposes.

## Technical controls already validated in PR #71

- Sitemap parses as valid XML.
- Sitemap URLs resolve to expected public repository files.
- Homepage canonical and robots sitemap declaration are present.
- Protected Command Center routes declare `noindex`/`nofollow` metadata.
- Authentication remains the security boundary for private application routes.
- Baseline static security headers are present.
- Command Center CI passes on the SEO branch.
- Public-site CI intentionally blocks the branch while the homepage self-rating remains.

## Release gates before PR #71 leaves Draft

1. Remove self-serving `AggregateRating` markup.
2. Rewrite or substantiate high-risk operational and SLA claims.
3. Remove or substantiate project/client counters.
4. Normalize certification/licensing language using exact verifiable wording.
5. Verify every sitemap URL is public, canonical, useful, and indexable.
6. Confirm authenticated Command Center layouts emit `noindex` and require authentication.
7. Validate redirects and security headers without breaking third-party assets.
8. Run and review both Command Center CI and Public Site Quality CI.
9. Review the final PR diff for accidental marketing, security, or deployment regressions.

## Future content rule

No fabricated reviews, locations, project counts, certifications, guarantees, SLAs, customer logos, partnerships, or performance statistics. Prefer specific evidence: real project scopes, documented capabilities, verified credentials, real service areas, useful tools, and accurate case studies.
