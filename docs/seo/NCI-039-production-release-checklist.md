# NCI-039 Production Release Checklist

## Release principle
NetworkConnectIT public releases are gated by professionalism, excellence, security, and quality. A green build is necessary but is not sufficient for production release.

## 1. Security blockers — must be complete
- [ ] Revoke/rotate every SMTP credential that was historically exposed in Git history.
- [ ] Replace the exposed reCAPTCHA secret/key configuration using the provider's supported administration flow.
- [ ] Never commit replacement secrets to Git, HTML, JavaScript, PHP, documentation, CI logs, or screenshots.
- [ ] Configure production-only secret values outside the public repository.
- [ ] Confirm `php/sendmail.php`, `php/PHPMailer.php`, `php/estimate.php`, and `php/estimate-network.php` contain no hard-coded credentials.
- [ ] Confirm contact reCAPTCHA verification fails closed when configuration/token validation fails.
- [ ] Confirm accepted reCAPTCHA hostname is restricted to `networkconnectit.com` and `www.networkconnectit.com`.
- [ ] Confirm private Command Center surfaces remain authenticated and `noindex`.

## 2. CI release gates — must be green on the exact release SHA
- [ ] Public Source Secret Safety.
- [ ] Public Site Quality.
- [ ] Command Center CI.
- [ ] No bypass/temporary disablement of release gates.

## 3. Public trust and content quality
- [ ] No fabricated or unsupported ratings, reviews, client/project totals, certifications, licenses, SLAs, response guarantees, uptime guarantees, monitoring claims, or data-custody claims.
- [ ] Any credential/license claim has a current approved evidence record before publication.
- [ ] Operational commitments such as monitoring, storage, emergency response, dispatch, and response targets are tied to the approved proposal/SOW/service agreement.
- [ ] No inherited template/off-topic marketing copy remains.
- [ ] Homepage, Services, About, Contact, Partner Support, Tools, and Command Center positioning are commercially consistent.

## 4. SEO and discoverability
- [ ] Canonical URLs resolve to the intended HTTPS public URLs.
- [ ] `robots.txt` references the production sitemap.
- [ ] Every sitemap URL resolves to a real intended public page.
- [ ] Important public pages have crawlable internal links with descriptive anchor text.
- [ ] Private/authenticated product pages are not included as indexable public content.
- [ ] Page titles, descriptions, headings, and visible content accurately describe the service/product; no keyword stuffing or doorway pages.
- [ ] Structured data mirrors visible, supportable facts.

## 5. Commercial conversion QA
- [ ] Primary CTA routes to the intended commercial project intake.
- [ ] Contact form posts only to the approved handler.
- [ ] Required contact/project fields are usable and clearly labeled.
- [ ] Successful submission is tested end-to-end using a non-sensitive test inquiry.
- [ ] Failed/invalid reCAPTCHA does not send email.
- [ ] SMTP delivery is verified after credential rotation without exposing credentials in logs.
- [ ] Contact recipient and Reply-To behavior are correct.

## 6. Visual and usability QA
Test on desktop and mobile:
- [ ] Home → Services → Contact.
- [ ] Home → Tools → Command Center public landing.
- [ ] Partner Support → commercial inquiry.
- [ ] Navigation menu opens/closes and all primary links resolve.
- [ ] No empty/placeholder links in release-critical navigation or CTA surfaces.
- [ ] No obvious layout overflow, clipped content, broken images, unreadable text, or overlapping controls.
- [ ] Forms remain usable with keyboard and mobile input.
- [ ] Meaningful images have useful alt text; decorative images do not create misleading link text.

## 7. Deployment validation
- [ ] Confirm the release SHA/commit being deployed.
- [ ] Deploy only after all required gates above are complete.
- [ ] Verify HTTPS redirect and `/index.html` canonical redirect in production.
- [ ] Verify baseline security headers in production.
- [ ] Verify contact endpoint behavior in production.
- [ ] Verify public pages and assets return expected status codes.
- [ ] Verify private Command Center authentication boundary after deployment.

## 8. Post-deployment verification
- [ ] Re-run a smoke test of Home, Services, Contact, Tools, and Command Center.
- [ ] Confirm sitemap is reachable and monitor it in Google Search Console.
- [ ] Inspect priority URLs in Search Console after deployment.
- [ ] Monitor mail/contact errors without logging secret values or customer-sensitive information.
- [ ] Resolve the historical secret-leak alert only after exposed credentials have actually been revoked/rotated.

## Release decision
Do **not** merge/deploy merely because CI is green. Release only when security rotation/configuration, end-to-end contact testing, and visual/mobile QA are complete.
