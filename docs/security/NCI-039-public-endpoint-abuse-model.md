# NCI-039 Public Endpoint Abuse Protection Standard

## Purpose
Protect NetworkConnectIT public contact and estimate workflows from automated abuse, mail flooding, resource exhaustion, and accidental over-processing without degrading legitimate commercial inquiries.

## Current endpoint inventory
- `php/sendmail.php` — commercial contact intake; reCAPTCHA + honeypot are required.
- `php/estimate.php` — JSON estimate submission that can trigger email delivery.
- `php/estimate-network.php` — JSON network estimate submission that can trigger email delivery.
- `php/PHPMailer.php` — legacy public mail handler retained for compatibility until its callers are fully inventoried.

## Threat model
Public endpoints that trigger SMTP, native mail, outbound verification, or non-trivial calculation are resource-consuming business operations. Treat repeated submissions as an abuse case even when the submitted payload is syntactically valid.

Primary risks:
1. Automated mail flooding and spam relay-like abuse of intended workflows.
2. Resource exhaustion from repeated POST requests.
3. Oversized or deeply nested JSON payloads.
4. Forged client fields and unexpected types.
5. Bypassing browser-side validation by calling PHP endpoints directly.
6. Sensitive information appearing in logs or error responses.
7. Controls that are so aggressive they block legitimate integrators or commercial prospects.

## Required controls
### Request method and content
- Allow only the intended HTTP method; reject others with `405`.
- Estimate JSON endpoints must require an appropriate JSON content type.
- Enforce a conservative maximum request-body size before JSON decoding.
- Reject malformed JSON and unexpected scalar/array types.
- Bound string lengths and numeric ranges server-side.
- Bound array sizes and allowlist values where practical.

### Anti-automation
- Keep reCAPTCHA and honeypot protection on the commercial contact workflow.
- Add endpoint-level throttling before production for every public operation that can send email.
- Prefer layered controls: hosting/WAF/edge throttling when available plus application-level safeguards.
- Rate-limit responses should be generic and use `429 Too Many Requests`.
- Do not expose internal counters, SMTP state, credential state, or detailed anti-bot decisions to callers.

### Mail delivery
- Never use visitor-controlled values as SMTP credentials or recipient destinations.
- Recipient destination must remain server-controlled.
- Visitor email may be used only as a validated Reply-To value.
- Replacement SMTP credentials must remain outside Git and the public document root.
- A failed SMTP attempt must not expose provider details or credentials to the client.

### Logging and privacy
- Log only operational outcomes needed for diagnosis.
- Do not log SMTP passwords, reCAPTCHA secrets/tokens, full message bodies, or unnecessary customer-sensitive fields.
- Prefer correlation IDs and aggregate failure categories over raw submitted content.

## Release requirements
Before production release:
- [ ] Inventory every public caller of all four PHP handlers.
- [ ] Confirm unused legacy endpoints can be removed or made non-public without breaking tools.
- [ ] Add request-size/type/range validation to active estimate endpoints.
- [ ] Select and validate a rate-limiting mechanism compatible with the actual GoDaddy/cPanel hosting environment.
- [ ] Confirm contact reCAPTCHA fails closed.
- [ ] Test normal legitimate submissions.
- [ ] Test malformed JSON, oversized payloads, wrong HTTP methods, and repeated requests in a controlled non-production context.
- [ ] Confirm responses do not disclose secrets or sensitive server configuration.
- [ ] Keep Public Source Secret Safety, Public Site Quality, and Command Center CI green on the exact release SHA.

## Implementation rule
Do not add a fragile file-based IP rate limiter inside the public webroot merely to satisfy a checklist. The final throttling implementation must match the hosting capabilities and avoid race-prone counters, publicly accessible state files, or collection of more personal data than necessary.
