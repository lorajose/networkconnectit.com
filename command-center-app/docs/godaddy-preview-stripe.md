# Stripe testing in the existing GoDaddy application

Both Preview and Published keep `NODE_ENV=production` and `npm start`.

Configure environment-scoped secrets:

| Variable | Preview | Published |
| --- | --- | --- |
| NCI_RUNTIME_ENV | preview | production |
| NCI_PREVIEW_ORIGIN | Actual HTTPS Preview origin, without trailing slash | Unset |
| NEXTAUTH_URL | Actual Preview origin + /api/auth | https://command.networkconnectit.com/api/auth |
| STRIPE_SECRET_KEY | Test secret key | Live secret key |
| STRIPE_PRO_PRICE_ID / STRIPE_BUSINESS_PRICE_ID | Prices from the same test environment | Live prices |
| STRIPE_SUBSCRIPTION_WEBHOOK_SECRET | Signing secret for test subscription endpoint on Preview | Live subscription endpoint signing secret |
| STRIPE_PROJECT_PASS_WEBHOOK_SECRET | Signing secret for test Project Pass endpoint on Preview | Live Project Pass endpoint signing secret |

Use a distinct NEXTAUTH_SECRET per environment. Do not paste secrets into GitHub or chat.
Existing TLS, private storage, bootstrap/recovery restrictions and read-only migration-history audit remain enforced. Existing audited migrate-deploy startup remains unchanged; Preview still operates against its configured database. This change neither migrates nor resets any database itself.

## Shared database limitation

Environment-specific Stripe credentials do NOT isolate database records. Test payments create real application subscription/pass records. Use dedicated test organizations and test projects; never test billing on an organization intended for live customers. Do not treat successful test entitlements as paid live entitlements. Separate database-backed billing namespaces are not implemented by this change. Before live onboarding, review/remove test organizations through supported application operations, or implement billing-mode isolation; do not delete migration history.

This gate validates configuration format and environment selection, not that price IDs or webhook secrets belong to the selected Stripe account. Verify those through actual test checkout and signed webhook delivery. Configure test webhooks to the Preview origin, never the published origin.
