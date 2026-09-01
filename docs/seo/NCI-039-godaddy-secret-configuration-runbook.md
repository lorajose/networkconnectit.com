# NCI-039 — GoDaddy Production Secret Configuration Runbook

## Purpose
Provide a controlled production procedure for NetworkConnectIT mail and reCAPTCHA secrets without committing sensitive values to Git or exposing them through the public document root.

## Non-negotiable security rules
- Never commit SMTP passwords, reCAPTCHA secrets, API keys, or replacement credentials to this repository.
- Never place secret values in public HTML, JavaScript, screenshots, PR/issue comments, CI output, or troubleshooting logs.
- Do not use `.user.ini` as a general-purpose secret store. GoDaddy documents `.user.ini` for supported PHP configuration directives.
- Do not assume cPanel Application Manager environment variables exist on this hosting account. cPanel documents that Application Manager and its environment-variable support depend on provider-enabled features/modules.
- Do not deploy until the historically exposed credentials have been revoked/rotated.

## Preferred configuration decision
### Option A — cPanel-managed environment variables
Use only if the hosting account exposes Application Manager (or another provider-supported runtime configuration surface) and PHP requests for this site actually receive the configured variables.

Required names:
- `NCI_SMTP_HOST`
- `NCI_SMTP_USER`
- `NCI_SMTP_PASSWORD`
- `NCI_SMTP_PORT`
- `NCI_CONTACT_TO`
- `NCI_RECAPTCHA_SECRET`

Validation requirement: confirm PHP can read the required variable names without ever printing their values.

### Option B — private server configuration outside the document root
If supported environment variables are unavailable for the PHP site, use a private server-side configuration file stored outside the website document root and outside the Git deployment tree.

Requirements:
- File must not be web-addressable.
- File must not be committed to Git.
- Restrict filesystem permissions to the hosting account/process that requires it.
- PHP handlers may load it only through a fixed server-side path.
- Do not create this fallback until the actual hosting home/document-root paths are confirmed in cPanel/SSH.

## Prohibited approaches
- Secrets committed to `.htaccess`, `.user.ini`, `.env`, PHP source, JavaScript, HTML, YAML, or documentation.
- Secrets supplied as query-string parameters.
- Temporary debug endpoints that print `phpinfo()`, `getenv()`, `$_ENV`, `$_SERVER`, mail credentials, or reCAPTCHA configuration.
- Reusing the historically exposed password/secret after remediation.

## Rotation sequence
1. Confirm which production configuration mechanism is supported by the hosting account.
2. Rotate/revoke the historically exposed SMTP credential at the mail provider.
3. Replace/rotate the exposed reCAPTCHA secret/key configuration using the provider-supported administration flow.
4. Configure the replacement values directly in the selected server-side mechanism.
5. Do not copy replacement secret values into GitHub, ChatGPT, tickets, screenshots, or documentation.
6. Verify the old SMTP credential can no longer authenticate.
7. Verify the application sees required configuration without revealing values.

## Contact-form verification
After configuration:
1. Submit a request with missing/invalid reCAPTCHA and confirm no email is sent.
2. Submit a valid non-sensitive test inquiry through the production contact form.
3. Confirm successful mail delivery to the approved recipient.
4. Confirm Reply-To uses the visitor email rather than spoofing the SMTP sender.
5. Confirm server logs contain no credentials, reCAPTCHA secret, or unnecessary customer-sensitive content.
6. Confirm hostname validation accepts only the approved production hostnames.

## Estimate endpoint verification
For `php/estimate.php` and `php/estimate-network.php`:
- Confirm no credential values are embedded in source.
- Confirm delivery uses the same approved server-side SMTP configuration.
- Confirm invalid input does not trigger mail.
- Review abuse/rate-control requirements before declaring the public endpoints production-ready.

## Release evidence
Before merge/deploy, record only non-sensitive evidence:
- configuration mechanism selected: environment variables OR private external config;
- SMTP credential rotated: yes/no;
- reCAPTCHA configuration replaced/rotated: yes/no;
- old credential invalidated: yes/no;
- invalid reCAPTCHA blocked: yes/no;
- valid test inquiry delivered: yes/no;
- exact release SHA with all CI gates green.

Never record secret values as release evidence.

## Release rule
If the hosting platform cannot provide a safe server-side secret mechanism, production mail functionality remains blocked. Security is not weakened to make the release pass.