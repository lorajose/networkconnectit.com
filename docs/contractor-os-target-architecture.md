# Contractor OS Target Architecture

Status: NCI-003 architecture decision

## 1. Architecture objective

Build Contractor OS by extending the existing Command Center application and data model, while keeping the public marketing/free-tools website isolated from the authenticated SaaS runtime. V1 deliberately stays a modular monolith: one deployable Next.js application, one MySQL database, server-side tenant enforcement, and separate managed services only where they provide a clear operational boundary (object storage, payments, AI, observability).

## 2. Frontend and runtime boundary

### Public website

- `networkconnectit.com` remains the static marketing site and free-tool acquisition surface.
- Static files continue to deploy to GoDaddy/cPanel through the hardened allowlist deployment flow.
- No SaaS source, Prisma schema, secrets, server code, or authenticated application runtime is copied into the public document root.

### Authenticated SaaS

- `command-center-app/` remains the canonical authenticated application codebase.
- Contractor OS workflows are added inside this same Next.js application rather than creating a second application or duplicate customer/project database.
- Production SaaS should run on a container-capable managed Node runtime using the existing standalone Docker build.
- Preferred public boundary: `app.networkconnectit.com` (root deployment). A reverse-proxied path remains supported by the code but is not the preferred production topology.
- GoDaddy static hosting is not the production runtime for the Next.js SaaS.

## 3. Backend/API boundary

- V1 is a modular monolith using Next.js Server Actions and Route Handlers.
- Business logic belongs in server-only domain modules, not in React components.
- Zod validates all untrusted input before domain operations.
- Prisma is the only normal application data-access layer.
- No public client receives direct database credentials, AI credentials, payment secrets, or storage write credentials.
- Do not introduce microservices for Estimate, Proposal, Survey, Closeout, or Billing in V1.
- Background monitoring/polling is explicitly a separate worker boundary when real device monitoring is implemented; it must not run as a long-running web request.

## 4. Shared domain and database model

### Database

- Keep MySQL + Prisma for V1.
- Use one production database with shared-schema multitenancy.
- `Organization` is the tenant root.
- Existing `Organization`, `Site`, `ProjectInstallation`, `ProjectSite`, `Device`, topology and monitoring records remain canonical and are extended rather than duplicated.

### Tenant isolation

- Tenant-owned records carry an `organizationId` directly or resolve to one through a mandatory parent relationship.
- Tenant identity comes from the authenticated server session; tenant users cannot choose an arbitrary organization ID for writes.
- `SUPER_ADMIN` and `INTERNAL_ADMIN` are global/internal roles; `CLIENT_ADMIN` and `VIEWER` are organization scoped.
- Cross-tenant reads and writes fail closed.
- New Contractor OS models must participate in the existing tenant-security regression suite before merge.

### V1 commercial models to add

Add only the domain records required by the frozen product scope:

- Estimate / EstimateVersion
- CostRule / CatalogItem
- EstimateLine / BOM item
- Proposal / sent snapshot
- SiteSurvey
- CableRun / CableTest
- ProjectDocument
- PaymentEntitlement
- ProjectEvent / AuditLog

These records reference the existing Organization/Site/ProjectInstallation core.

## 5. Authentication and authorization

- Continue NextAuth for V1; current credentials + bcrypt implementation is the starting point.
- JWT sessions remain short-lived application sessions; role and organization context are carried in the authenticated server session.
- Authorization is enforced on the server through shared RBAC/tenant helpers, never only through hidden UI controls.
- Sensitive writes should resolve or verify authoritative role/tenant context server-side before persistence.
- Broad SaaS onboarding requires the separate account-lifecycle work: invitations, password reset, disable/revoke, login-abuse controls, and first-admin bootstrap lockdown.
- Production must use a unique high-entropy `NEXTAUTH_SECRET`; bootstrap routes remain disabled except for controlled one-time provisioning.

## 6. File, photo and document storage

- Do not store survey photos, closeout evidence, generated PDFs, or customer uploads in the Git repository or public cPanel filesystem.
- Use private S3-compatible object storage as the storage boundary.
- Store only metadata, ownership, object key, MIME type, size, checksum/version, and document classification in MySQL.
- Browser uploads/downloads use short-lived signed URLs issued by authenticated server code.
- Every object key is namespaced by organization/project and authorization is checked before a signed URL is issued.
- Production implementation may use Cloudflare R2 or another S3-compatible managed provider without changing the application-domain contract.

## 7. AI boundary

- AI is an assistive server-side service, not an authoritative calculator.
- Natural-language scope is sent from authenticated server code to the configured model provider.
- Provider credentials are server-only environment secrets.
- AI output must be constrained to a documented structured schema and validated with Zod before use.
- AI produces structured scope suggestions; the deterministic cost engine performs all authoritative labor/material/markup/margin arithmetic.
- Persist model/provider metadata and the accepted structured result where auditability matters; do not persist unnecessary prompt/customer secrets.
- Provider access is wrapped behind one application service so the model vendor can be changed without rewriting estimate/proposal modules.

## 8. Payment boundary

- Stripe is the V1 payment boundary.
- Checkout sessions are created only by trusted server code.
- Price/product identifiers are server-controlled; the browser never determines entitlement by query string or client state.
- Stripe webhooks are signature verified and idempotent.
- Successful verified events persist `PaymentEntitlement`/subscription state in MySQL.
- Premium proposal/closeout/export authorization reads persisted server-side entitlement.
- Project Pass is implemented before broad recurring subscriptions, following the product roadmap.

## 9. Environments and deployment flow

### Local

- Next.js app + local MySQL, either native or `docker-compose.local.yml`.
- `.env.local` is developer-only and never committed.
- Prisma development migrations are created locally on a feature branch.

### CI

- Pull requests run the Command Center CI gate: tenant/security regressions, lint, production build, typecheck, and Prisma validation.
- Failing CI blocks merge.

### Staging

- Separate runtime URL, database, secrets, storage namespace/bucket prefix, Stripe test mode and AI credentials/quota.
- Apply `prisma migrate deploy` before or during an explicitly controlled application release.
- Use staging for auth, tenant, upload, payment-webhook and end-to-end workflow verification.

### Production

- Static website deployment remains the existing GitHub -> approval gate -> cPanel allowlist flow.
- Authenticated SaaS deploys independently from `command-center-app/` to a managed container runtime.
- Production uses a separate MySQL database and separate secrets from staging.
- Deployment requires green CI and a protected production approval gate.
- Database migrations use `prisma migrate deploy`; never run demo seed/reset against production.
- Prefer blue/green or platform rollback to the previous application image; schema migrations must be backward-safe for the release where possible.

## 10. Backup, observability and security baseline

### Database

- Automated daily backups minimum; production provider should support point-in-time recovery when commercially reasonable.
- Document and test restore procedure before broad customer onboarding.
- Backup retention and restore tests are tracked as operational controls, not assumed from provider defaults.

### Object storage

- Private-by-default bucket/prefix policy.
- Versioning/lifecycle retention where supported for customer evidence and generated documents.

### Observability

- Structured application logs with request/error correlation.
- Sentry (or equivalent) for server/client exception reporting.
- External uptime checks for SaaS health/login surface.
- Security-sensitive events and commercial lifecycle changes feed `ProjectEvent/AuditLog` as that model is introduced.
- Never log passwords, session tokens, database URLs, payment secrets, signed upload credentials, or raw AI provider keys.

### Security

- HTTPS only in staging/production.
- Secrets live in the runtime/GitHub environment secret stores, not source control.
- CI tenant/RBAC regression suite remains mandatory.
- Server Actions/Route Handlers enforce authentication, authorization, tenant resolution, input validation and entitlement checks as applicable.
- Public static hosting and SaaS runtime remain separate deployment/security boundaries.

## 11. Explicit non-goals for V1 architecture

- No Kubernetes.
- No event-driven microservice mesh.
- No second customer/site/project database for Contractor OS.
- No native mobile application until mobile web proves insufficient.
- No direct browser-to-MySQL access.
- No AI-generated authoritative pricing.
- No customer files in public cPanel directories.
- No long-running monitoring workers inside normal Next.js request handlers.

## 12. Target topology

```text
                        +-----------------------------+
Visitors --------------> networkconnectit.com         |
                        | Static marketing/free tools |
                        | GoDaddy/cPanel              |
                        +-----------------------------+
                                      |
                                      | acquisition / login link
                                      v
                        +-----------------------------+
Users -----------------> app.networkconnectit.com     |
                        | Next.js modular monolith    |
                        | Container runtime           |
                        +-----------------------------+
                           |       |       |       |
                           v       v       v       v
                        MySQL   Object   Stripe   AI provider
                        Prisma  storage  webhooks  server-only
                           |
                           v
                    Tenant-scoped domain
      Organization -> Site -> ProjectInstallation -> Device
                           |
                           +-> Estimate -> Proposal
                           +-> Survey -> Cable Runs/Tests
                           +-> Closeout/Documents
                           +-> Entitlements/Audit
```

## 13. Consequences

This architecture prioritizes shipping and revenue validation over infrastructure novelty. It reuses the strongest existing Command Center assets, isolates the static hosting boundary, keeps tenant enforcement centralized, and leaves clear seams for storage, payments, AI and future monitoring workers. The first infrastructure decision required during implementation is selection/provisioning of the managed container runtime and production MySQL service; the application remains portable because the runtime is Docker/Node and the database contract stays MySQL/Prisma.
