# NCI-017 Subscription QA Matrix

## Purpose

Validate the recurring subscription lifecycle in Stripe Test Mode before PR #168 is promoted beyond the current development branch.

This QA must use a dedicated QA runtime and Stripe test credentials only. Never commit real Stripe secrets, webhook signing secrets, customer IDs, subscription IDs, or payment data.

## Preconditions

- Branch: `nci-017-billing-experience`
- PR: #168
- QA runtime passes `npm run qa:gate`
- `NODE_ENV=production`
- `NCI_RUNTIME_ENV=qa`
- QA database name clearly identifies QA/test/staging
- QA database TLS is enabled
- `NEXTAUTH_URL` points to the QA application auth endpoint and uses HTTPS
- Bootstrap/recovery flags are disabled
- Private storage is isolated from production
- Stripe account is in Test Mode
- Server-only QA environment contains:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET`
  - `STRIPE_PRO_PRICE_ID`
  - `STRIPE_BUSINESS_PRICE_ID`
- Stripe webhook endpoint targets the QA route:
  - `/api/subscriptions/webhook/stripe`
- Webhook subscriptions include:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

## Required actors

Use one organization with:
- one `CLIENT_ADMIN`
- one non-billing client role, such as `CLIENT_VIEWER`

Do not reuse production organizations or production Stripe customers.

## QA flow

| ID | Scenario | Action | Expected result |
| --- | --- | --- | --- |
| QA-017-01 | Free baseline | Open Billing as CLIENT_ADMIN on an organization with no trial/subscription | Tier is FREE; one-time Pro trial action is visible; paid features remain unavailable |
| QA-017-02 | Viewer authorization | Open Billing as CLIENT_VIEWER and attempt billing mutations | Billing state may be read as allowed, but no trial/checkout/change/cancel mutation is authorized |
| QA-017-03 | Start trial | CLIENT_ADMIN starts the Pro trial | Effective access becomes PRO with source TRIAL; 30-day trial messaging appears |
| QA-017-04 | Trial replay | Attempt to start the trial again | Trial does not restart or extend |
| QA-017-05 | Checkout redirect only | Start Pro checkout, then return/cancel without a trusted lifecycle webhook | Redirect/navigation alone does not create paid entitlement |
| QA-017-06 | Pro subscribe | Complete Pro checkout with a Stripe test payment method | Signed Stripe lifecycle webhook persists ACTIVE/TRIALING paid state; effective access becomes PRO with source SUBSCRIPTION |
| QA-017-07 | Duplicate webhook | Replay the same Stripe event | Processing is idempotent; entitlement is not duplicated or corrupted |
| QA-017-08 | Stale webhook | Deliver an older lifecycle event after a newer accepted event | Older event cannot roll back current subscription state |
| QA-017-09 | Immediate upgrade | Upgrade PRO to BUSINESS | Stripe uses server-owned Business Price ID; verified webhook changes effective access to BUSINESS |
| QA-017-10 | Schedule downgrade | Schedule BUSINESS to PRO at period end | BUSINESS remains current; pending PRO change and effective date are shown; other billing mutations are locked |
| QA-017-11 | Cancel scheduled downgrade | Choose Keep Business / cancel scheduled downgrade | Stripe schedule is released; pending plan/schedule state is cleared; BUSINESS remains active |
| QA-017-12 | Re-schedule downgrade | Schedule BUSINESS to PRO again | Pending PRO state is restored while BUSINESS remains current |
| QA-017-13 | Downgrade transition | Advance/test lifecycle so Stripe reports the actual PRO transition | Webhook changes current plan to PRO and clears pending schedule fields |
| QA-017-14 | Cancel at period end | Schedule cancellation of current paid subscription | Paid entitlement remains active until the provider reports cancellation; UI shows end-of-period cancellation |
| QA-017-15 | Final cancellation | Deliver/receive the Stripe deleted/canceled lifecycle event | Paid source ends; effective access falls back to valid trial only if one is still eligible/active, otherwise FREE |
| QA-017-16 | Resubscribe | After persisted status is fully CANCELED, subscribe again | Checkout reuses the previously verified persisted Stripe Customer; browser cannot choose another customer ID |
| QA-017-17 | Replacement identity attack | Send a replacement-created event for a different Stripe Customer | Event is rejected; persisted subscription/customer identity is unchanged |
| QA-017-18 | Old subscription after replacement | Deliver an event from the previous subscription identity after replacement | Old provider identity cannot overwrite the replacement subscription |
| QA-017-19 | Return URL | Complete/cancel checkout in QA | Stripe returns to the QA app Billing page, never to `/api/auth/billing` and never to the production host |
| QA-017-20 | Paid feature enforcement | Test premium outputs/exports/Design Studio before and after verified paid access | Server-side feature guards match effective entitlement; browser state alone cannot unlock premium features |

## Stripe Test Mode evidence

For every provider-dependent case, record:
- QA case ID
- Stripe event ID
- event type
- organization ID from the QA database
- expected plan/status
- observed plan/status
- PASS/FAIL
- screenshot or log reference where appropriate

Do not copy secret keys, webhook signing secrets, full payment details, or authorization headers into evidence.

## Security invariants

QA is a release blocker if any of these fail:

1. Organization identity always comes from the authenticated server session.
2. The browser can select only the commercial plan, never provider customer/subscription/schedule identity.
3. Checkout success/cancel redirects never grant entitlement.
4. Only verified Stripe lifecycle events can persist paid access.
5. Stripe Price IDs are mapped server-side.
6. Replacement subscriptions must match the persisted Stripe Customer.
7. Duplicate and stale events cannot corrupt newer state.
8. Trial cannot be restarted for the same organization.
9. Non-billing roles cannot mutate subscription state.
10. QA runtime, database, storage, URLs, and Stripe credentials remain isolated from production.

## Exit criteria

NCI-017 may be considered QA-passed only when:
- all automated CI jobs remain green,
- all QA-017 cases above are PASS,
- no production resource was used,
- no secret was committed or copied into QA evidence,
- no unresolved billing/security regression remains,
- PR #168 is still reviewed before any merge or environment promotion.

A green automated CI run alone is not sufficient to mark the Stripe Test Mode QA matrix complete.
