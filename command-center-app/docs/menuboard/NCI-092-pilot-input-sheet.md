# NCI-092 — MenuBoard Pilot Input Sheet

Use this sheet before bench provisioning. Replace every `TBD` that applies to the installation before declaring the pilot **GO**.

This document must never contain passwords, Wi-Fi passphrases, pairing codes, raw player tokens, or other credentials.

## Customer / site

| Field | Value |
| --- | --- |
| Customer / organization | TBD |
| Store / site name | TBD |
| Service address | TBD |
| Primary onsite contact | TBD |
| Installation date | 2026-10-19 |
| Installer(s) | TBD |
| Internet available | TBD |
| Wired Ethernet available at TVs | TBD |
| Notes | TBD |

## Screen topology

Create one row per physical TV/panel.

| Screen label | Physical location | Independent content? | Wall group | TV size | Native resolution | Orientation | HDMI input | Network | Player label | Menu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCREEN-01 | TBD | Yes | — | TBD | 1920x1080 | Landscape | TBD | Wired preferred | NCI-DELI01-S01 | TBD |
| SCREEN-02 | TBD | Yes | — | TBD | 1920x1080 | Landscape | TBD | Wired preferred | NCI-DELI01-S02 | TBD |

Rules:

- If two TVs need different content, they require independent player endpoints.
- If multiple TVs intentionally form one panoramic canvas, give them the same Wall group and validate the wall-controller topology separately.
- Do not use an HDMI splitter for independent menus.
- Do not leave screen labels ambiguous; the physical label, Command Center screen name, Pi hostname and closeout photo must all map to the same screen.

## Player inventory

Prepare one player per independent screen plus one spare.

| Player label | Pi model | RAM | Storage | PSU | Case/cooling | HDMI | Ethernet cable | Provisioned | Bench pass | Spare? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NCI-DELI01-S01 | TBD | TBD | TBD | TBD | TBD | TBD | TBD | No | No | No |
| NCI-DELI01-S02 | TBD | TBD | TBD | TBD | TBD | TBD | TBD | No | No | No |
| NCI-DELI01-SPARE | TBD | TBD | TBD | TBD | TBD | TBD | TBD | No | No | Yes |

## Brand assets

| Asset | Source / status |
| --- | --- |
| Store display name | TBD |
| Logo | TBD |
| Primary brand style notes | TBD |
| Promotion title | TBD |
| Promotion text | TBD |
| Promotion image | TBD / not used |

Use only customer-approved assets. If an asset is not approved, omit it from the pilot rather than inventing or substituting one in the field.

## Menu content

Create one table per menu.

### Menu: TBD

| Section | Item | Description | Price | Visible | Image |
| --- | --- | --- | ---: | --- | --- |
| TBD | TBD | TBD | TBD | Yes | TBD |
| TBD | TBD | TBD | TBD | Yes | TBD |

Content rules:

- Prices must be customer-confirmed before Publish.
- Do not use placeholder prices on a live customer display.
- Keep item names short enough for the 16:9 deli template.
- Hide unavailable products rather than deleting history during the pilot.
- Confirm which screen(s) receive this menu.

## Screen-to-menu assignment

| Screen | Assigned menu | Expected first publish | Verified assignment |
| --- | --- | --- | --- |
| SCREEN-01 | TBD | v1 | No |
| SCREEN-02 | TBD | v1 | No |

## Bench evidence

Complete after provisioning each player.

| Screen | Pairing | Publish v1 | Price-change publish | Rollback | Offline 5 min | Reconnect | Power-cycle | Expected = Displayed | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCREEN-01 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | PENDING |
| SCREEN-02 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | PENDING |
| SPARE | ☐ | N/A | N/A | N/A | ☐ | ☐ | ☐ | N/A | PENDING |

## Field acceptance

| Acceptance item | Result | Notes |
| --- | --- | --- |
| Every screen boots unattended into MenuBoard | PENDING | |
| Every screen shows the correct assigned menu | PENDING | |
| Text/prices readable at customer viewing distance | PENDING | |
| Customer price edit completed from admin UI | PENDING | |
| Publish updated only intended screen(s) | PENDING | |
| Last-known-good content survives Internet outage | PENDING | |
| Command Center health/current-version correct | PENDING | |
| Player/mount/cabling photos captured | PENDING | |
| Final front-of-screen photos captured | PENDING | |
| Customer acceptance completed | PENDING | |

## GO / NO-GO

Current status: **NO-GO — input sheet incomplete**.

Change to **GO** only when:

- all required `TBD` customer/topology fields are resolved;
- enough players, power supplies and HDMI/network components are physically available;
- final menu content/prices are customer-confirmed;
- every production player passes the bench evidence matrix;
- one spare player is ready;
- the verified software branch/release used for the bench test is recorded.

Verified software reference for the current pilot branch:

- Branch: `nci-083-menuboard-pilot-architecture-v1`
- Last exact-head software verification before this input-sheet commit: `4eb507083f985204ecd19716e8ad9a84991de636`
- Command Center CI #1382: PASS
- Public Source Secret Safety #1108: PASS
