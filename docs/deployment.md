# NetworkConnectIT Deployment Boundaries

## Static website

The cPanel deployment defined in `/.cpanel.yml` deploys only explicitly public website assets to:

`/home/oblm9wnyeimr/networkconnectit.com/`

Public assets include root HTML pages and the website asset/application directories required by the public site (`css`, `img`, `js`, `lib`, `tools`, and `mail` when present).

The deployment intentionally does **not** copy the repository wholesale. In particular, the following remain outside the public document root:

- `.git/` and `.github/`
- `command-center-app/` source
- `docs/`
- repository configuration
- Prisma source and migrations
- Docker files
- environment templates or secrets
- package manifests that are not required by the static website

## Command Center

`command-center-app/` is a Next.js/Node application and must be deployed as its own application runtime. It must not be served by copying its source tree into the static website document root.

Production environment variables belong in the application runtime/environment configuration, never in the public website tree or committed repository files.

## CI

`.github/workflows/command-center-ci.yml` verifies Command Center changes using the repository's existing `verify:staging` script before merge/deployment.

## Production deployment automation

A production deploy workflow can be enabled after a dedicated cPanel/GoDaddy SSH deployment credential is configured as GitHub Actions secrets. Do not commit private keys, passwords, database URLs, or production tokens to this repository.

Recommended flow:

1. Pull request.
2. CI passes.
3. Merge to `main`.
4. GitHub Actions connects using a dedicated deploy credential.
5. The cPanel-managed repository receives the approved revision.
6. cPanel runs `.cpanel.yml`.
7. Only allowlisted public assets are synchronized to the website document root.

Keep production deployment behind a GitHub Environment approval until the automated path has been validated in staging/production.
