# NCI-039 — GoDaddy Secret Configuration Plan

## Purpose
Define the production secret-storage decision before NetworkConnectIT rotates or installs replacement SMTP/reCAPTCHA credentials. No secret values belong in this document or repository.

## Current hosting constraint
NetworkConnectIT is deployed on GoDaddy Web Hosting (cPanel). The public PHP handlers currently read runtime values through `getenv()`.

Official platform documentation shows two important constraints:

1. GoDaddy shared hosting documents `.user.ini` for PHP directives; this is PHP configuration and must not be treated as a general-purpose secret store.
2. cPanel Application Manager can expose application environment variables only when the hosting provider has the required Apache `mod_env` capability enabled. Availability must therefore be verified on the actual account before relying on it.

## Security decision gate
Do **not** rotate/install replacement production secrets until one of the following storage mechanisms is verified on the actual hosting account.

### Option A — cPanel-managed environment variables (preferred when available)
Use a provider-supported cPanel application/environment-variable interface if it is present and the PHP runtime can read the variables with `getenv()`.

Required runtime names:
- `NCI_SMTP_HOST`
- `NCI_SMTP_USER`
- `NCI_SMTP_PASSWORD`
- `NCI_SMTP_PORT`
- `NCI_CONTACT_TO`
- `NCI_RECAPTCHA_SECRET`

Acceptance test:
- PHP can detect that each required variable is configured without printing its value.
- No value exists in Git, the public document root, deployment manifests, CI output, screenshots, or documentation.

### Option B — private server-side configuration outside the public document root
If cPanel-managed environment variables are unavailable or unreliable on this shared-hosting account, use a private configuration file outside the website document root and modify the PHP handlers to load it securely.

Requirements:
- File lives outside `/home/oblm9wnyeimr/networkconnectit.com`.
- File is not copied by `.cpanel.yml` and is not tracked by Git.
- Restrictive account-level filesystem permissions are applied.
- Public HTTP requests cannot retrieve the file.
- PHP handlers fail closed when the configuration is absent or incomplete.
- Secret values are never echoed or logged.

A private-file implementation must be code-reviewed and CI-tested before production use. Do not create a secret file inside the repository as a shortcut.

## Explicitly rejected approaches
- Hard-coded credentials in PHP.
- Secrets in HTML or JavaScript.
- Committing a `.env`, `.user.ini`, `.htaccess`, YAML, JSON, or PHP config containing production secrets to Git.
- Putting secret values in GitHub PRs/issues/comments, documentation, CI logs, screenshots, or chat messages.
- Assuming `.user.ini` is a secret manager merely because GoDaddy supports it for PHP directives.

## Rotation sequence
1. Verify the production storage mechanism without using real replacement secrets.
2. Rotate/revoke the historically exposed SMTP credential at the provider.
3. Replace/rotate the exposed reCAPTCHA secret/key configuration through the provider-supported administration flow.
4. Install replacement values directly in the verified server-side storage mechanism.
5. Confirm PHP can access required configuration without revealing values.
6. Test missing/invalid reCAPTCHA and confirm mail is not sent.
7. Submit a non-sensitive test inquiry and verify SMTP delivery and Reply-To behavior.
8. Confirm old credentials no longer authenticate.
9. Only then mark the historical secret-leak incident resolved.

## Release rule
The PR remains **GATED — DO NOT MERGE OR DEPLOY** until the actual GoDaddy account supports a verified non-public secret-storage mechanism and the rotation plus end-to-end tests are complete.
