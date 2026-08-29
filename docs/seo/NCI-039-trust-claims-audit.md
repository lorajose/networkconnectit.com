# NCI-039 — SEO Trust, Claims, and Structured Data Audit

Status: In progress
Date: 2026-08-29
Scope: Public NetworkConnectIT marketing site and Command Center discovery surfaces.

## Quality standard

Public SEO content must be accurate, supportable, visible to users, and consistent with the actual service being offered. Security and authentication controls must never rely on crawler directives.

## High-priority findings

### 1. Homepage AggregateRating

Current homepage JSON-LD contains an `AggregateRating` with `ratingValue: 4.9` and `reviewCount: 48`.

Decision: remove this markup unless the rating and underlying reviews can be independently verified and are presented in a way that complies with search-engine structured-data policies. Do not amplify or duplicate this rating elsewhere.

### 2. Service-plan claims

Current public copy and/or structured data includes strong operational promises such as:

- 24/7 monitoring or engineer availability
- guaranteed or priority response windows
- cloud CCTV backup
- monthly security audits
- dual-ISP failover
- dedicated technician coverage

Decision: treat these as unverified commercial claims until service scope, operational capability, exclusions, and customer terms are confirmed. Do not strengthen them in metadata or structured data during NCI-039.

### 3. Certification and licensing language

Current pages use phrases such as `Cisco Certified`, `Cisco/UniFi certified experts`, and related credential language.

Decision: credential claims may remain only when they accurately describe current, verifiable credentials and do not imply a vendor partnership or company-level certification that does not exist. Exact wording will be normalized after verification.

### 4. Public/private Command Center boundary

The public `/tools/command-center/` product landing is intended for discovery. Authenticated application routes must be protected by application authentication and emit `noindex` metadata. `robots.txt` is crawler guidance only and is not a security boundary.

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

## Release gates before PR #71 leaves Draft

1. Remove or substantiate unsupported `AggregateRating` markup.
2. Review pricing/plan promises for operational and contractual accuracy.
3. Normalize certification/licensing language.
4. Verify every sitemap URL is public, canonical, useful, and indexable.
5. Confirm authenticated Command Center layouts emit `noindex` and require authentication.
6. Validate redirects and security headers without breaking third-party assets.
7. Run and review repository CI.

## Future content rule

No fabricated reviews, locations, project counts, certifications, guarantees, SLAs, customer logos, partnerships, or performance statistics. Prefer specific evidence: real project scopes, documented capabilities, verified credentials, real service areas, useful tools, and accurate case studies.
