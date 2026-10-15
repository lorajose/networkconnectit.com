# NCI-092 — MenuBoard Deli Pilot Field Runbook

Target field date: Monday, October 19, 2026.

This runbook is the release gate for the first customer pilot. It does not authorize a production deployment or database migration.

## 1. Customer inputs required before bench test

Record these before leaving for the site:

- Store/site name and service address.
- Final TV count.
- Screen label for every TV (for example `COUNTER-01`, `COUNTER-02`).
- TV size, native resolution, orientation and available HDMI input.
- Whether each TV is independent or belongs to a panoramic/video-wall group.
- Final logo/brand asset.
- Final menu sections, item names, descriptions and prices.
- Promotion title/text/images, if used.
- Network path for each player: wired Cat6 preferred; Wi-Fi is fallback.

Do not invent missing menu prices or screen topology in the field.

## 2. Hardware inventory

For every independent screen prepare one player plus one spare for the pilot:

- Raspberry Pi 4/5 player.
- High-endurance microSD card.
- Correct Raspberry Pi power supply.
- Ventilated/active-cooled case where appropriate.
- Micro-HDMI to HDMI cable/adaptor appropriate for the Pi.
- Cat6 patch cable for wired service.
- Mounting/Velcro hardware and labels.

Also carry one known-good HDMI cable, one spare power supply and the spare pre-provisioned player.

A TV wall controller is only used when multiple panels intentionally form one canvas. It is not a substitute for independent players when TVs need different menus.

## 3. Bench provisioning record

Use `scripts/menuboard-pi/provision.sh` and the Raspberry Pi provisioning guide.

For each player record:

| Field | Value |
| --- | --- |
| Player label | |
| Intended screen | |
| Pi hostname | |
| Screen ID | |
| Pairing completed | |
| Menu assigned | |
| Expected publish version | |
| Displayed publish version | |
| Network mode | Wired / Wi-Fi |
| Power-cycle pass | |
| Offline-cache pass | |
| Credential-revoke pass (test unit only) | |

Never put a durable player token in this document, a photo, GitHub, Notion or a device label.

## 4. Bench acceptance sequence

The pilot is bench-ready only when all required steps pass:

1. Boot each Pi and verify Chromium returns automatically to the MenuBoard player.
2. Pair the player using the short-lived on-screen pairing code.
3. Assign the intended menu to the intended screen.
4. Publish a known-good menu version and verify `Displayed = Expected` in Command Center.
5. Change one known test price and publish the next version.
6. Confirm only the intended screen(s) switch to the new version.
7. Roll back and verify the prior immutable version renders again.
8. Disconnect Internet for at least five minutes and confirm the last-known-good menu remains visible.
9. Confirm Command Center transitions through the expected health policy as the heartbeat ages.
10. Restore Internet and confirm heartbeat and current publish state recover without re-pairing.
11. Power-cycle every production player and confirm unattended kiosk recovery.
12. On a test player, revoke the credential and confirm stale customer content is cleared and the player returns to pairing/recovery state.

If any player fails power-cycle or offline-cache validation, replace or repair it before the site visit.

## 5. Field installation sequence

1. Photograph the TV/input area before changes.
2. Label the Pi, power lead and HDMI lead with the screen label.
3. Mount the player so it is ventilated, serviceable and cannot hang from HDMI/power cables.
4. Connect Ethernet where available before using Wi-Fi.
5. Select the intended HDMI input and disable TV sleep/eco behavior that would interrupt signage where the TV permits it.
6. Confirm the assigned menu fills the intended display and text is readable from normal customer viewing distance.
7. Verify Command Center reports the correct screen and current publish version.
8. Repeat for each independent screen.
9. Perform one customer-visible price edit from the admin interface and Publish.
10. Confirm the intended TV updates and other independent screens remain correct.

## 6. Customer acceptance

Before leaving the site, demonstrate:

- Login to the MenuBoard admin experience.
- Find the correct menu/product.
- Change a price.
- Publish.
- Confirm the intended TV updates.
- Explain that a temporary Internet loss should not blank the last published menu.

Do not give the customer Raspberry Pi OS credentials or expose internal player tokens as part of normal MenuBoard operation.

## 7. Closeout evidence

Capture for every installed screen:

- Screen label and Screen ID.
- Physical location.
- TV make/model if visible without disassembly.
- Network mode.
- Expected/displayed publish version at closeout.
- Final front-of-screen photo.
- Player/mount/cabling service photo.

Record any deviation, especially use of Wi-Fi, HDMI extension, video-wall hardware or inaccessible power.

## 8. Go / no-go gate

**GO** only when every production player passes pairing, publish, current-version, offline-cache and power-cycle checks and the final customer menu data is loaded.

**NO-GO** when screen topology is unknown, a required player/power/HDMI component is missing, a player cannot recover after reboot, the display blanks when Internet is removed, or the customer menu/prices are not confirmed.

## 9. Rollback / service recovery

If a newly published menu is wrong, use the MenuBoard publish history rollback rather than editing the immutable published payload.

If a player fails in the field, install the pre-provisioned spare, pair it to the intended screen, verify current content, then remove/revoke the failed player's credential as appropriate.

If the site Internet is down but cached content is displaying correctly, do not factory-reset or re-pair a healthy player merely to restore cloud status.
