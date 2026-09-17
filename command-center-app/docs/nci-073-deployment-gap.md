# NCI-073 — Command Center Deployment Gap

## Confirmed repository behavior

The current cPanel deployment workflow is named **Deploy Website to cPanel**, deploys the static website, and ignores pushes that only change `command-center-app/**`. The Command Center CI workflow validates/builds the Next.js application and its standalone output, but does not deploy that output to a persistent QA runtime.

## Consequence

After a Command Center feature merges to `main`, CI may be green while the live/static site remains unchanged. Runtime QA cannot assume `main` is deployed merely because the cPanel static-site workflow is healthy.

## Engineering work needed

Choose and document one controlled Command Center deployment path before production:

- cPanel/Passenger or another supported persistent Node application setup using the standalone Next.js build; or
- a separate supported Node hosting environment for Command Center while the marketing site remains on cPanel.

The deployment must support persistent environment configuration, MySQL connectivity, Prisma migrations, authentication callbacks/base path, and either persistent private filesystem storage or the private Supabase storage driver for NCI-042.

Do not add an automated production deploy until the target runtime, paths, process manager/restart method and rollback strategy are verified.