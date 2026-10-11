# NCI-074 Consolidated V1 Release Gate — Current Contract

This is the current Release Gate 1 contract. It supersedes older ticket classifications that treated NCI-017 as post-V1.

## Dependency order

NCI-017 Subscription QA → NCI-073 Design Studio runtime QA → NCI-033 Production hardening → NCI-074 Consolidated release decision.

NCI-074 may be prepared in parallel, but it cannot PASS before all three dependencies above have their required runtime evidence.

## Exact pre-release requirements

### NCI-017
- [ ] Exact QA candidate SHA recorded.
- [ ] Stripe Test Mode QA matrix completed.
- [ ] Trial, subscribe, upgrade, scheduled downgrade, cancel scheduled change, cancel-at-period-end and same-customer resubscribe verified.
- [ ] CLIENT_VIEWER/CLIENT_ADMIN billing authorization verified.
- [ ] Checkout redirect alone does not grant entitlement.
- [ ] Webhook lifecycle is the server authority.
- [ ] No unresolved subscription security/payment defect.

### NCI-073
- [ ] Exact Design Studio candidate SHA recorded.
- [ ] Chrome desktop PASS.
- [ ] Edge desktop PASS.
- [ ] Safari desktop PASS.
- [ ] iPad Safari PASS.
- [ ] Real PDF/PNG/JPEG imports PASS.
- [ ] DXF remains unsupported/fails closed.
- [ ] Private asset and cross-tenant negative checks PASS.
- [ ] PDF/CSV/JPG/Topology-SVG surfaces validated where actually exposed.
- [ ] Design → reviewed Takeoff/BOM → Estimate → Proposal PASS.

### NCI-033
- [ ] `npm run release:gate` passes against production environment without exposing secrets.
- [ ] Fresh pre-deploy DB backup recorded and verified.
- [ ] Full read-only migration-history audit passes.
- [ ] DB/TLS transport documented and verified.
- [ ] Private storage runtime evidence passes.
- [ ] Bootstrap and all recovery flags disabled.
- [ ] Previous production SHA/package recorded for rollback.

## Production Stripe hard stop

Because recurring subscriptions are now part of V1, production Release Gate 1 must reject:
- missing Stripe secret key;
- `sk_test_` keys;
- missing subscription webhook secret;
- invalid/missing PRO or BUSINESS Price IDs;
- identical PRO and BUSINESS Price IDs.

The gate validates configuration shape and live-mode intent. Actual Stripe object ownership/account correctness must still be confirmed by the controlled production smoke flow.

## Frozen Release Candidate

Before deployment:
- [ ] Freeze one exact 40-character SHA.
- [ ] Secret Safety green on that SHA.
- [ ] Command Center CI green on that SHA.
- [ ] GoDaddy root/standalone build green on that SHA.
- [ ] No unresolved PR review thread.
- [ ] NCI-017/NCI-073/NCI-033 evidence references attached.
- [ ] Migration audit/backup evidence attached.
- [ ] Release decision explicitly recorded.

Any code change after freezing invalidates the candidate and requires the affected evidence to be rerun.

## Controlled deployment rule

One controlled production deployment only after all pre-deploy P0 requirements PASS. No individual feature deployment while this gate is open.

## Post-deploy P0 smoke

- [ ] deployed SHA equals frozen SHA
- [ ] health endpoint
- [ ] login/callback/logout
- [ ] SUPER_ADMIN / INTERNAL_ADMIN / CLIENT_ADMIN / VIEWER
- [ ] cross-tenant direct-ID denial
- [ ] private storage authorized read + unauthorized denial
- [ ] Site Survey → Work Order → testing → punch → acceptance → closeout
- [ ] Estimate → Proposal
- [ ] Design Studio → Takeoff/BOM → Estimate → Proposal
- [ ] client-safe exports do not expose internal economics
- [ ] subscription production checkout/webhook lifecycle smoke
- [ ] newly pending Prisma migrations recorded exactly once

## STOP conditions

STOP or rollback application release if any occurs:
- frozen/deployed SHA mismatch
- release gate failure
- test-mode Stripe key in production
- migration drift/incomplete/checksum mismatch
- backup unavailable
- auth/base-path failure
- cross-tenant data exposure
- private asset public exposure
- internal economics in customer output
- failed migration/startup/health
- subscription webhook/entitlement authority failure

NCI-074 closes last.
