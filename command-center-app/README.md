# NetworkConnectIT Security Command Center

`command-center-app/` is the real application layer for the NetworkConnectIT Security Command Center. It is intentionally isolated from the existing static marketing site in the same repository. The static site remains unchanged and can later link to this app through a subdomain or reverse-proxied path.

## What This App Includes

This MVP includes:

- Next.js 14 App Router application with TypeScript
- NextAuth credentials authentication with JWT sessions
- role-based access control for:
  - `SUPER_ADMIN`
  - `INTERNAL_ADMIN`
  - `CLIENT_ADMIN`
  - `VIEWER`
- strict tenant-scoped server-side reads and writes
- Prisma + MySQL data layer
- organization, site, and device CRUD
- alerts list/detail and alert workflow actions
- health-check timelines and internal simulation flow
- Prisma-backed admin dashboard and viewer portal
- demo seed data for local setup and handoff

## Out Of Scope For Phase 1

- billing
- AI detections
- live video / streaming
- mobile app
- ticketing
- deep vendor integrations
- real polling engine or scheduler beyond the built-in simulation flow

## Core Stack

- Next.js 14+
- React 18
- TypeScript
- Tailwind CSS
- Prisma ORM
- MySQL
- NextAuth
- React Hook Form
- Zod
- Leaflet + OpenStreetMap

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env.local
```

3. Fill in `.env.local`:

```env
DATABASE_URL="mysql://username:password@127.0.0.1:3306/networkconnectit_command_center"
DATABASE_ADMIN_URL="mysql://root:your-root-password@127.0.0.1:3306/networkconnectit_command_center"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_APP_BASE_PATH=""
```

Recommendations:

- use a real local MySQL database
- create the target database first if your local MySQL setup does not auto-create it during migration
- set `DATABASE_ADMIN_URL` to a MySQL user with enough privilege for `prisma migrate dev`
- keep `NEXTAUTH_URL` as `http://localhost:3000` for local dev
- leave `NEXT_PUBLIC_APP_BASE_PATH` empty for local root-based development
- generate `NEXTAUTH_SECRET` with something like:

```bash
openssl rand -base64 32
```

4. Run the first local bootstrap:

```bash
npm run bootstrap:local
```

This runs:

- Prisma client generation
- Prisma schema validation
- a development migration
- demo seed data

`bootstrap:local` and the Prisma package scripts load values from `.env.local` first, then `.env`, so you do not need to duplicate your local database settings into multiple files.
`prisma migrate dev` automatically uses `DATABASE_ADMIN_URL` when it is present so Prisma can create its temporary shadow database during local development.

5. Start the app:

```bash
npm run dev
```

6. Open:

```text
http://localhost:3000
```

## Manual Setup Alternative

If you want to run each step yourself:

```bash
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate:dev -- --name block-5-mvp
npm run prisma:seed
npm run dev
```

## Demo Credentials

All demo users are seeded with the same demo password:

```text
CommandCenterDemo!2026
```

Accounts:

- `super.admin@networkconnectit.demo` — `SUPER_ADMIN`
- `internal.admin@networkconnectit.demo` — `INTERNAL_ADMIN`
- `midtown.admin@networkconnectit.demo` — `CLIENT_ADMIN`
- `brooklyn.admin@networkconnectit.demo` — `CLIENT_ADMIN`
- `longisland.admin@networkconnectit.demo` — `CLIENT_ADMIN`
- `midtown.viewer@networkconnectit.demo` — `VIEWER`
- `brooklyn.viewer@networkconnectit.demo` — `VIEWER`
- `longisland.viewer@networkconnectit.demo` — `VIEWER`

## Demo Seed Data

`npm run prisma:seed` recreates a full demo dataset for the MVP.

Seed coverage includes:

- internal users
- client admin and viewer users
- organizations:
  - Midtown Medical Group
  - Brooklyn Logistics Center
  - Long Island Retail Hub
- 2 to 4 realistic sites per organization
- realistic device inventory across:
  - `CAMERA`
  - `NVR`
  - `ROUTER`
  - `SWITCH`
  - `ACCESS_POINT`
- varied monitoring modes, statuses, and `lastSeenAt`
- recent health-check history with realistic messages and latency
- open, acknowledged, and resolved alerts tied to sites and devices

Important:

- the seed is demo-oriented and resets application tables before recreating the dataset
- it is intended for local development, demos, and handoff environments

## Package Scripts

- `npm run dev` — start local dev server
- `npm run build` — production build
- `npm run start` — run built app
- `npm run lint` — Next.js lint pass
- `npm run typecheck` — TypeScript typecheck
- `npm run prisma:generate` — generate Prisma client
- `npm run prisma:validate` — validate Prisma schema
- `npm run prisma:migrate:dev` — run development migrations
- `npm run prisma:migrate:deploy` — run deploy migrations
- `npm run prisma:studio` — open Prisma Studio
- `npm run prisma:seed` — load demo data
- `npm run bootstrap:local` — first-run local bootstrap

## Docker Support

Docker support is included and stays isolated to `command-center-app/`.

Files:

- [`Dockerfile`](./Dockerfile)
- [`.dockerignore`](./.dockerignore)
- [`docker-compose.local.yml`](./docker-compose.local.yml)

What it covers:

- local MySQL container
- local app container running the Next.js dev server
- production-oriented Dockerfile using Next.js standalone output

Example local Docker workflow:

1. Start the stack:

```bash
docker compose -f docker-compose.local.yml up --build
```

2. In another terminal, run the bootstrap inside the app container once:

```bash
docker compose -f docker-compose.local.yml exec app npm run bootstrap:local
```

3. Open:

```text
http://localhost:3000
```

Notes:

- the compose setup is intended for local development and demos
- it does not replace a production deployment plan
- the bootstrap step is separate on purpose so the app container does not reset the database on every startup
- Prisma commands inside the container use the same `.env.local`-aware wrapper as local package scripts
- the compose file provides `DATABASE_ADMIN_URL` with MySQL root credentials so `bootstrap:local` can run inside the app container

## Deployment Notes

This app is the real Command Center application. The static marketing site remains separate.

Safe future deployment patterns:

- `https://command-center.networkconnectit.com`
- `https://networkconnectit.com/command-center/` behind a reverse proxy
- `https://networkconnectit.com/tools/command-center/` if you mount the Node app at that exact base URL and build with `NEXT_PUBLIC_APP_BASE_PATH=/tools/command-center`

Why MySQL + Prisma:

- aligns with likely GoDaddy cPanel MySQL availability
- keeps the app portable between local Docker, hosted MySQL, and future VPS/container environments

Architecture note for the static-site split:

- the existing static page at `tools/command-center/index.html` should remain a simple handoff page until deployment is finalized
- once deployed, that page can link to the live app URL without coupling the static site to Next.js internals
- if you choose to mount the app directly at `/tools/command-center/`, the static landing page can remain on disk but the Node app should own that public URL in cPanel/Application Manager

## Architecture Summary

Authentication:

- NextAuth credentials provider
- bcrypt password hashes
- JWT session strategy

Tenant scope:

- enforced server-side through shared helpers in `lib/management/tenant.ts`
- internal roles have global scope
- client roles are organization-scoped
- unauthorized IDs resolve to scoped misses rather than leaking data

Dashboard aggregation:

- centralized in `lib/dashboard/service.ts`
- Prisma-backed metrics, map markers, site health summaries, device distribution, and recent alerts

Monitoring simulation flow:

- internal roles can trigger safe simulated health runs from site and device detail pages
- simulation creates `HealthCheck` records
- simulation updates `Device.status` and `lastSeenAt`
- simulation opens, updates, or resolves related health alerts

Core Prisma models:

- `User`
- `Organization`
- `Site`
- `Device`
- `HealthCheck`
- `Alert`

## Migration Notes

Recent schema additions include:

- `HealthCheck.checkType`
- `HealthCheck.message`
- `DeviceType.ACCESS_POINT`

If you are starting from scratch locally, a good first migration name is:

```bash
npm run prisma:migrate:dev -- --name block-5-mvp
```

If you prefer the guided first-run path, use:

```bash
npm run bootstrap:local
```

## Verification

The app has been verified with:

```bash
npm run prisma:generate
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```
