# NCI-072 — Design Studio Subscription & Feature Entitlements

## Goal
Package Design Studio as a paid value driver by extending the existing NCI-017 subscription authority, not by creating a second billing system.

## Already implemented by NCI-017
The current server-owned subscription catalog already defines:
- PRO and BUSINESS plans;
- 30-day PRO trial with FREE fallback;
- server-authoritative effective access;
- PREMIUM_PROJECT_OUTPUTS;
- PROPOSAL_AND_CLOSEOUT_EXPORTS;
- TEAM_COLLABORATION;
- ADVANCED_DESIGN_STUDIO;
- DXF_WORKFLOWS;
- Stripe-backed recurring subscription lifecycle.

Existing plan shape:
- PRO: unlimited projects, premium outputs, proposal/closeout exports, advanced Design Studio.
- BUSINESS: PRO capabilities plus team collaboration, DXF workflows and priority support.

## NCI-072 remaining scope
Do not rebuild NCI-017. Close only the Design Studio-specific gaps:

### Feature matrix
FREE:
- useful entry experience;
- limited project/design capability;
- no premium issued outputs.

PRO:
- Advanced Design Studio.
- Premium project outputs.
- Proposal/closeout exports.
- Limits must be explicit and server checked.

BUSINESS:
- all PRO features;
- team collaboration;
- DXF workflows when implemented;
- higher catalog/team limits where defined.

### Required server checks
- premium export routes;
- collaboration mutations;
- DXF import/export workflow when implemented;
- catalog/project/team limits once product limits are defined.

UI gating is informational only; server authorization remains authoritative.

## Important DXF rule
NCI-073 currently treats DXF as unsupported. BUSINESS entitlement may reserve the capability, but it must not present DXF as available until implementation and QA exist.

## Metrics
Measure:
- trial started;
- first Design Studio project;
- first saved design;
- first takeoff/BOM handoff;
- premium feature blocked prompt;
- checkout started;
- subscription activated;
- PRO→BUSINESS upgrade;
- trial expiry→FREE;
- conversion by trigger/feature.

No payment or entitlement is granted from analytics events.

## Pricing experiments
Experiment with packaging/copy/limits through server-owned configuration and analytics. Do not allow browser-selected prices or entitlement flags.

## Completion rule
NCI-072 is complete when Design Studio-specific server checks, feature matrix, upgrade prompts and metrics are wired to NCI-017 without duplicating billing authority.
