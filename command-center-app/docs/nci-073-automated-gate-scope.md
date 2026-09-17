# NCI-073 — Automated vs Runtime Gate Scope

## Automated today

`npm run verify:ci` runs the security regression suite followed by staging verification (lint, build, typecheck and Prisma validation). The GitHub Command Center workflow also performs a repository-root GoDaddy-style install/build and verifies standalone artifacts.

These checks are strong evidence for code integrity, type/build health, Prisma schema validity and regression contracts.

## Not automated by that workflow

The current CI workflow does not create a real MySQL QA database, apply production-like migrations to it, launch a persistent externally reachable QA environment, execute browser automation, test iPad behavior, benchmark a representative large project, or validate private filesystem persistence on the target host.

Those remain NCI-073 runtime gates.

## Deployment distinction

The repository's cPanel workflow is a static-site deployment workflow and ignores `command-center-app/**` pushes. Command Center/Design Studio runtime QA therefore requires a separate Node/Next deployment process or an explicitly configured application deployment on the target host.

## Acceptance rule

Never convert absence of an automated failure into evidence that a runtime criterion passed. Record runtime evidence explicitly.