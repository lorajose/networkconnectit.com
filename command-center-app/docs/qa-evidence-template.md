# QA Evidence Record

Use one copy of this record per QA candidate/release attempt.

## Candidate

- Date:
- Tester:
- Environment URL:
- Git SHA:
- Database/migration version:
- Browser/device:

## Automated gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Command Center `verify:ci` | ☐ PASS ☐ FAIL | |
| GoDaddy root build / standalone | ☐ PASS ☐ FAIL | |
| Public source secret safety | ☐ PASS ☐ FAIL | |
| `prisma:migrate:deploy` | ☐ PASS ☐ FAIL | |
| `verify:staging` | ☐ PASS ☐ FAIL | |

## Functional gates

| Area | Result | Evidence / defect |
| --- | --- | --- |
| Floor plan import | ☐ PASS ☐ FAIL | |
| Scale / walls / obstacles | ☐ PASS ☐ FAIL | |
| Camera FOV | ☐ PASS ☐ FAIL | |
| DORI / density overlays | ☐ PASS ☐ FAIL | |
| Cable routes / lengths | ☐ PASS ☐ FAIL | |
| Multidisciplinary layers | ☐ PASS ☐ FAIL | |
| Topology generation | ☐ PASS ☐ FAIL | |
| Design → Takeoff/BOM | ☐ PASS ☐ FAIL | |
| Takeoff/BOM → Estimate → Proposal | ☐ PASS ☐ FAIL | |
| Internal report | ☐ PASS ☐ FAIL | |
| Client-safe report | ☐ PASS ☐ FAIL | |
| Issued report evidence/versioning | ☐ PASS ☐ FAIL | |
| NCI-042 private document flow | ☐ PASS ☐ FAIL | |
| Tenant/RBAC/direct-ID | ☐ PASS ☐ FAIL | |
| Large-project benchmark | ☐ PASS ☐ FAIL | |
| Safari | ☐ PASS ☐ FAIL | |
| Chrome | ☐ PASS ☐ FAIL | |
| Edge | ☐ PASS ☐ FAIL | |
| iPad/tablet workflow | ☐ PASS ☐ FAIL | |

## Release blockers

- P0 blockers:
- Security defects:
- Data-loss defects:
- Client-safe/export defects:
- Performance blockers:

## Decision

- ☐ Candidate accepted for intended release scope
- ☐ Candidate rejected; defects linked below

Defect/ticket links:
