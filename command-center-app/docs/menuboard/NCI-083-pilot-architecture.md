# NCI-083 — MenuBoard v1 Pilot Architecture & Data Model

Status: In Progress
Target pilot: Monday, October 19, 2026

## Goal

Ship the smallest production-safe MenuBoard foundation that can support the first deli installation without coupling the screen runtime to a specific Raspberry Pi image or third-party signage product.

## Architecture boundaries

### Tenant ownership

MenuBoard reuses the existing `Organization -> Site` tenant hierarchy. A deli customer is an Organization and each physical store is a Site. MenuBoard records always carry `organizationId`; store-scoped records also carry `siteId` so authorization never depends on a client-supplied parent alone.

### Admin plane

Authenticated Command Center routes manage menus, items, screens, assignments and publishing. Every mutation resolves the authenticated organization before reading or writing MenuBoard data.

### Player plane

A physical screen never receives an admin session. Pairing creates a screen-scoped credential. The public player API resolves only that credential and returns only the screen's currently published snapshot plus required display assets.

Raw long-lived player secrets must not be stored. Persist a one-way hash and support rotation/revocation.

### Draft and publish boundary

Editing a menu changes draft data only. Publish creates an immutable `MenuPublish` snapshot with a monotonically increasing version for that menu. Screen assignments point at a menu, while the player receives the latest published snapshot. This prevents half-edited menus from appearing on TVs.

The snapshot is self-contained JSON so a player can cache the last known-good version and keep rendering through a temporary network outage.

## V1 domain model

### MenuBoardScreen

- `id`
- `organizationId`
- `siteId`
- `name`
- `orientation` (`LANDSCAPE`/`PORTRAIT`)
- `widthPx`, `heightPx`
- `status` (`UNPAIRED`/`ONLINE`/`STALE`/`OFFLINE`/`REVOKED`)
- `playerTokenHash` nullable
- `playerTokenIssuedAt` nullable
- `playerTokenRevokedAt` nullable
- `lastSeenAt` nullable
- `displayedPublishVersion` nullable
- timestamps

### Menu

- `id`
- `organizationId`
- `siteId`
- `name`
- `currency` (default `USD`)
- `templateKey` (V1 default `DELI_LANDSCAPE_V1`)
- timestamps

### MenuSection

- `id`
- `organizationId`
- `menuId`
- `name`
- `sortOrder`
- timestamps

### MenuItem

- `id`
- `organizationId`
- `menuId`
- `sectionId`
- `name`
- `description` nullable
- `priceCents` integer
- `imageUrl` nullable
- `isAvailable`
- `sortOrder`
- timestamps

Money is stored as integer cents, never floating point.

### MenuPublish

- `id`
- `organizationId`
- `menuId`
- `version`
- `payload` JSON
- `payloadHash`
- `publishedByUserId`
- `publishedAt`

Unique `(menuId, version)`.

### MenuScreenAssignment

- `id`
- `organizationId`
- `screenId`
- `menuId`
- timestamps

V1 permits one active menu per screen and one menu on many screens.

### MenuPlayerHeartbeat

- `id`
- `organizationId`
- `screenId`
- `playerVersion` nullable
- `publishVersion` nullable
- `receivedAt`

Heartbeat history can be pruned; `MenuBoardScreen.lastSeenAt` remains the fast current-health lookup.

## Public player contract

`GET /api/menuboard/player/content`

Authentication: screen bearer credential.

Response contains only:

- screen presentation metadata;
- published menu version and hash;
- self-contained render payload;
- cache metadata.

It must not expose Organization/User records, admin identifiers, draft data, other screens, other menus or credentials.

`POST /api/menuboard/player/heartbeat`

Updates only the authenticated screen. Client-supplied `screenId` is not authoritative.

## Pairing contract

1. Admin creates an unpaired screen.
2. Command Center generates a short-lived, single-use pairing code.
3. Raspberry Pi opens the player pairing view and submits the code.
4. Backend consumes the code atomically and returns a newly generated screen credential once.
5. Only the credential hash is persisted.
6. Admin can revoke/rotate the credential at any time.

## Offline behavior

The web player stores the last validated published snapshot and its assets locally. It renders cache immediately at boot, checks for a newer version when online, validates the returned payload/version, then atomically replaces the cache. A failed refresh never erases the last known-good menu.

## Pilot constraints

- Primary target: Raspberry Pi running Chromium kiosk mode.
- Player runtime remains web-based and replaceable; Anthias is not a domain dependency.
- First template: 16:9 deli landscape.
- Support 3–10 independently addressable screens per store.
- No production migration or deployment is part of NCI-083.

## Security invariants

- Every admin read/write is tenant scoped.
- IDs from the browser never establish tenant ownership.
- Player credentials are screen scoped, revocable and stored hashed.
- Pairing codes expire and are single use.
- Published snapshots contain display-safe fields only.
- Draft edits are never visible through the player endpoint.
- Revoked credentials fail closed.

## Implementation sequence

1. NCI-083 — architecture/schema contract.
2. NCI-084 — store/screen registration and pairing.
3. NCI-085 — category/item/price manager.
4. NCI-086 — deli template/composer.
5. NCI-087 — immutable publish and screen assignment.
6. NCI-088 — fullscreen player/offline cache.
7. NCI-089 — Raspberry Pi kiosk provisioning.
8. NCI-091 — security/tenant QA.
9. NCI-092 — bench test and field acceptance.

NCI-090 heartbeat UI can follow the critical pilot path if schedule pressure requires it.
