# ADR-0022: Command Center ↔ Contractor OS Domain Boundary

Status: Proposed for approval under NCI-022

## Context

Contractor OS extends the existing authenticated Command Center application. The platform already has canonical tenant and installation entities (`Organization`, `Site`, `ProjectInstallation`, `ProjectSite`, devices/topology/monitoring). Contractor OS adds commercial and field-execution workflows such as estimating, proposals, surveys, cable runs/tests, documents, payments and closeout.

The boundary must avoid a second customer/site/project hierarchy while preserving a clear distinction between commercial work before award and operational installation records after award.

## Decision

### 1. Organization is the canonical customer/tenant root

`Organization` remains the single tenant/customer account in the authenticated platform.

- Contractor OS does not introduce a duplicate `Customer` tenant table.
- A commercial customer account resolves to one `Organization`.
- Contacts, billing identities and sales metadata may be added as child/domain records, but tenant ownership stays on `Organization`.
- All commercial and operational records inherit or resolve `organizationId` through mandatory relationships.

### 2. Site is the canonical physical location

`Site` remains the canonical service/installation location.

- Estimates, proposals, surveys and installation work reference an existing `Site` when the location is known.
- A lightweight pre-award address/snapshot may be captured inside estimate/survey data before a site is finalized, but conversion creates or links one canonical `Site`; it does not create a parallel long-lived commercial-site model.
- Site identity must not be inferred only from a mutable address string.

### 3. Commercial project and ProjectInstallation have different responsibilities

Contractor OS needs a commercial work container, but `ProjectInstallation` remains the operational installation/NOC object.

#### Commercial Project

The Contractor OS commercial project owns the pre-award and commercial lifecycle:

- opportunity/scope context;
- estimate versions and cost assumptions;
- proposal versions/sent snapshots;
- site-survey inputs/evidence collected before execution;
- commercial status, expected value and customer approval state;
- entitlement/payment references relevant to commercial documents.

A commercial project may exist before installation work is authorized.

#### ProjectInstallation

`ProjectInstallation` owns the post-award execution/commissioning lifecycle:

- installation scope accepted for execution;
- one or more linked sites through existing project-site relationships;
- deployed devices, topology and commissioning state;
- cable-run/test execution records when tied to field installation;
- closeout/commissioning outputs;
- monitoring handoff and operational state.

A commercial project may produce zero, one or multiple `ProjectInstallation` records if an awarded job is split by phase/site. V1 should default to one installation for a normal awarded job and only split when execution requires it.

### 4. Estimate, Proposal and Survey ownership

- `Estimate` and `EstimateVersion` belong to the commercial project and `Organization`; they may reference a `Site` when known.
- `Proposal` belongs to the commercial project and stores immutable sent/accepted snapshots so later estimate edits do not rewrite customer-visible history.
- `SiteSurvey` belongs to the commercial project and `Organization`, and references the canonical `Site` when available.
- Survey evidence needed for execution is referenced during handoff rather than copied into a duplicate installation survey table.
- Once awarded, selected/accepted commercial artifacts become read-only handoff references for the installation record; operational updates do not mutate the accepted proposal snapshot.

### 5. Installation handoff contract

Award/approval is an explicit server-side domain operation, not a client-side copy workflow.

Input contract:

- authenticated tenant/user context;
- commercial project ID;
- accepted proposal/version ID when applicable;
- selected site(s);
- optional execution phase metadata.

Server-side validations:

- commercial project belongs to the authenticated organization;
- referenced proposal/version belongs to that project and is in an allowed accepted/approved state;
- referenced sites belong to the same organization;
- caller has the required role/permission;
- operation is idempotent and cannot accidentally create duplicate installations for the same handoff key.

Output contract:

- created or existing `ProjectInstallation` ID(s);
- relationship back to the originating commercial project;
- immutable references to accepted estimate/proposal/survey snapshots/evidence;
- generated `ProjectEvent/AuditLog` event recording who performed the handoff, when, source commercial project, accepted commercial artifact and target installation(s).

### 6. Data moves by reference/snapshot, not destructive transformation

The commercial records remain authoritative for commercial history. Installation records reference the accepted commercial state needed for execution.

- Do not move rows out of Estimate/Proposal/Survey tables during handoff.
- Do not let execution edits rewrite accepted customer-facing commercial snapshots.
- Execution-specific fields belong to installation/cable/device/closeout records.
- Shared physical/customer identities (`Organization`, `Site`) are referenced directly.

### 7. Ownership matrix

| Domain data | Canonical owner | Handoff behavior |
| --- | --- | --- |
| Customer/tenant identity | `Organization` | Shared directly |
| Physical location | `Site` | Shared directly |
| Commercial project lifecycle | Contractor OS commercial project | Remains commercial source of truth |
| Estimate/version/cost assumptions | Commercial project | Accepted version referenced/snapshotted |
| Proposal/sent acceptance | Commercial project | Immutable accepted snapshot referenced |
| Pre-award survey/evidence | Commercial project + Site | Referenced by installation |
| Installation execution | `ProjectInstallation` | Created/linked at award |
| Project/site execution relationship | `ProjectSite` | Operational source of truth |
| Devices/topology/commissioning | Command Center installation domain | Operational source of truth |
| Cable runs/tests | Installation execution domain | Created/updated during field work |
| Closeout documents | Installation/project document domain | Generated from operational + accepted commercial data |
| Monitoring state | Command Center operational domain | Begins after commissioning/handoff |
| Entitlements/payment state | Contractor OS billing domain | Referenced for feature authorization |

## Required schema implications

- Add one commercial project model rather than reusing `ProjectInstallation` for pre-award records.
- Add an explicit relationship from commercial project to resulting `ProjectInstallation` record(s), implemented through a direct foreign key or handoff/junction model depending on Prisma constraints when schema work begins.
- New Estimate/Proposal/Survey models reference the commercial project and tenant; `Site` is referenced where applicable.
- Accepted proposal/estimate versions must support immutable snapshots/version IDs.
- Handoff must have an idempotency mechanism and audit event.

Exact Prisma names/fields are intentionally deferred to the schema implementation ticket; this ADR freezes responsibilities and ownership first.

## Rejected alternatives

### Reuse ProjectInstallation for the entire sales lifecycle

Rejected because it mixes unawarded opportunities with operational installations and weakens Command Center semantics, monitoring assumptions and reporting.

### Create separate Contractor OS Customer and Site tables

Rejected because it duplicates tenant/location identity, creates synchronization problems and increases tenant-isolation risk.

### Copy all commercial rows into installation tables at award

Rejected because duplicated mutable data drifts and makes audit/history ambiguous. Accepted snapshots and explicit references preserve commercial history while giving execution a stable contract.

## Consequences

- Contractor OS and Command Center share tenant and site identity while retaining clear commercial vs operational lifecycle boundaries.
- Pre-award workflows can evolve without polluting installation/NOC records.
- Award becomes a deliberate, testable and auditable domain transition.
- Future multi-site/phased jobs are supported without forcing V1 complexity into every normal project.
- Schema implementation must not introduce parallel customer/site roots or bypass existing tenant enforcement.

## Approval gate

No duplicate Customer/Site/installation schema work should begin until this ADR is approved and merged. Approval of this ADR authorizes implementation tickets to create the commercial project relationship and handoff contract consistent with these boundaries.
