# NCI-039 — Public Website Content Standard

Status: Active release policy
Scope: NetworkConnectIT public marketing pages and public tool landing pages

## Purpose

NetworkConnectIT public content must communicate capability with professionalism, excellence, security, and quality without relying on unsupported guarantees, inflated proof, ambiguous credentials, or legacy template copy.

## Mandatory standards

### 1. Claims must be supportable

Public copy must not present an operational capability, response time, uptime level, monitoring commitment, backup service, certification, customer count, project count, or review score as fact unless NetworkConnectIT has current evidence supporting the claim.

When evidence is not yet documented, use accurate capability language such as:

- "resilience-focused network design" instead of "zero downtime"
- "priority response options available by agreement" instead of a guaranteed response time
- "proactive monitoring options" instead of an unconditional 24/7 NOC promise
- "CCTV retention and backup planning" instead of implying custody of cloud recordings
- "coordinated technical support" instead of promising a dedicated technician
- "experience with Cisco and UniFi environments" when a specific certification claim has not been verified for publication

### 2. Security language must be precise

Do not claim that a design prevents breaches, eliminates vulnerabilities, guarantees continuity, or keeps a customer secure. Describe the control and intended risk reduction instead.

Preferred language includes segmentation, least privilege, secure configuration, patch planning, monitoring, redundancy, documentation, and reducing avoidable disruption.

### 3. Proof must have a source of truth

Reviews, ratings, testimonials, project totals, customer totals, certifications, licenses, SLAs, and performance statistics require a documented source of truth before publication. If evidence expires, the public claim must be reviewed or removed.

### 4. Public pages must match the actual business

Legacy template sections that describe unrelated services must be removed or rewritten. Pricing FAQs, service descriptions, metadata, calls to action, and structured data must describe NetworkConnectIT's current networking, low-voltage, CCTV, access-control, deployment-support, and contractor-software offerings.

### 5. Structured data must mirror visible truth

Structured data must describe visible, current, supportable page content. Do not publish self-serving LocalBusiness aggregate ratings. Do not add schema solely to manufacture a search appearance.

### 6. Private product surfaces remain private

Authenticated Command Center routes must remain protected by application authentication and declare noindex. robots.txt is crawl guidance, not an access-control mechanism.

### 7. Release gate

A public-content change is not ready for production until:

1. Public Site Quality passes.
2. Command Center CI passes when applicable.
3. High-risk claims are evidenced or rewritten.
4. Sitemap and canonical URLs are valid.
5. Private application surfaces retain authentication and noindex controls.
6. Static security headers remain present.
7. Visual QA confirms desktop and mobile presentation, navigation, CTA clarity, and no obvious legacy/template content.

## Content review order

1. Homepage
2. Pricing
3. Services
4. About / Features
5. Contact / Testimonials
6. Blog
7. Public tools and Command Center landing

## Definition of done

A prospective commercial buyer should be able to understand what NetworkConnectIT does, who it serves, where it works, why it is credible, and what action to take next without encountering a claim that NetworkConnectIT cannot confidently substantiate.