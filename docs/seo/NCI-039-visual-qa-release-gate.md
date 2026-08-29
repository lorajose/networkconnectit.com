# NCI-039 — Public Website Visual QA Release Gate

## Purpose
This checklist defines when the SEO/trust branch is safe enough for Jose to review visually before production release. The goal is a professional, credible, secure, high-quality public experience rather than a rushed SEO deployment.

## Release gate before visual review
- Public Site Quality workflow passes all blocking checks.
- Command Center CI remains green.
- Homepage LocalBusiness structured data contains no self-serving aggregate rating.
- Structured data only describes services and business facts that are visible and supportable.
- High-risk claims (24/7, guaranteed response times, cloud CCTV backups, dedicated technician, zero-downtime, project/client counters) are either evidenced or rewritten conservatively.
- Public marketing pages remain indexable; authenticated Command Center and auth surfaces remain noindex and access-controlled.
- Sitemap contains only canonical public URLs that resolve to repository-backed public pages.
- HTTPS/canonical redirect behavior and baseline security headers are validated.

## Visual QA path
1. Home — positioning, trust, mobile hero, primary CTA.
2. Services — commercial scope clarity and buyer fit.
3. Tools — navigation, public tool discoverability, no broken links.
4. Command Center public landing — product positioning without exposing authenticated content.
5. Contact / Request Quote — clear conversion path and professional copy.
6. Mobile — navigation, CTA visibility, spacing, images, forms, and page speed perception.

## Acceptance standard
A visitor should understand within seconds what NetworkConnectIT does, who it serves, where service is available, why the company is credible, and what action to take next. No unsupported guarantee, rating, certification implication, or security promise may be used to increase conversion or search visibility.

## Production rule
The PR stays Draft until the automated quality gates are green and the visual QA checkpoint is ready. Production merge/deployment happens only after the branch is technically clean and the visual review does not identify a release-blocking issue.
