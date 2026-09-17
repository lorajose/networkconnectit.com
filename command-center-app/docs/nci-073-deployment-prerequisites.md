# Command Center QA Deployment Prerequisites

Before attempting a QA deployment, confirm the host supports:

- persistent Node.js application execution compatible with the repository build;
- the configured Node version and `npm ci`;
- writable application/build paths;
- persistent environment variables/secrets;
- outbound/remote MySQL connectivity required by `DATABASE_URL`;
- running `prisma:migrate:deploy`;
- correct public auth callback URL and optional base path;
- application restart after deploy/config change;
- logs sufficient to diagnose startup/auth/database failures;
- persistent private filesystem storage or private Supabase storage for NCI-042.

If any prerequisite is unavailable on the current cPanel/shared-hosting runtime, use a separate supported Node application host for Command Center rather than weakening security or persistence requirements.