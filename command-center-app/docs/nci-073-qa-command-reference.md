# NCI-073 — QA Command Reference

Run from `command-center-app` unless noted otherwise.

```bash
npm ci
npm run prisma:generate
npm run prisma:validate
npm run security:test
npm run lint
npm run typecheck
npm run build
npm run verify:staging
npm run verify:ci
npm run prisma:migrate:deploy
```

From repository root, the GoDaddy-style validation path is:

```bash
npm ci
npm run build
test -f command-center-app/.next/build-manifest.json
test -f command-center-app/.next/standalone/server.js
```

`prisma:migrate:deploy` is a target-environment operation and must point to the intended QA/production database. Never paste database credentials into tickets, logs, documentation or screenshots.