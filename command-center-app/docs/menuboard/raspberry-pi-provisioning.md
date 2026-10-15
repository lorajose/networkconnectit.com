# NetworkConnectIT MenuBoard — Raspberry Pi Field Provisioning

This procedure creates a repeatable Raspberry Pi kiosk for the NetworkConnectIT MenuBoard web player.

## Supported baseline

Use Raspberry Pi OS with Desktop on Raspberry Pi 4 or Pi 5. The current Raspberry Pi desktop uses Wayland with labwc; the provisioning script installs the kiosk launcher through labwc autostart rather than relying on legacy X11 autostart files.

Recommended pilot hardware:

- Raspberry Pi 5, 4 GB or greater.
- 64 GB high-endurance microSD card or approved SSD.
- Official Raspberry Pi power supply.
- Ventilated case or active cooler.
- Micro-HDMI to HDMI cable.
- Wired Ethernet preferred; Wi-Fi is acceptable where cabling is not available.
- TV configured to restore power and return to the correct HDMI input after an outage.

## 1. Image the device

Use Raspberry Pi Imager and select Raspberry Pi OS with Desktop.

Before writing the card, configure:

- Hostname: use a label such as `nci-deli01-screen01`.
- User/password for NetworkConnectIT field support.
- Wi-Fi credentials only when wired Ethernet will not be used.
- Time zone and keyboard.
- SSH only when remote field support is required by the deployment policy.

Do not embed a MenuBoard player credential into the image. Each physical screen is paired after installation with a short-lived code.

## 2. Copy and run the provisioning script

From the checked-out repository on the Pi:

```bash
cd command-center-app/scripts/menuboard-pi

export MENUBOARD_URL="https://YOUR-HOST/tools/command-center/menuboard/player"
export NCI_DEVICE_LABEL="nci-deli01-screen01"

sudo -E bash ./provision.sh
```

The script is intentionally idempotent. It:

- boots Raspberry Pi OS directly to the desktop with automatic login;
- disables Raspberry Pi desktop screen blanking;
- adds `consoleblank=0` as an additional console safety;
- creates a Chromium kiosk launcher with automatic restart if Chromium exits;
- adds the launcher to `~/.config/labwc/autostart`;
- optionally sets the Raspberry Pi hostname from `NCI_DEVICE_LABEL`.

The script does not store the six-digit pairing code or the issued player token in shell scripts or image files.

## 3. Reboot and pair

Reboot:

```bash
sudo reboot
```

Expected behavior after power-up:

1. Raspberry Pi OS signs in automatically.
2. Chromium opens the MenuBoard player full-screen.
3. If the device has not been paired, the screen shows only the NetworkConnectIT pairing page.
4. In Command Center, open **MenuBoard → Screen Fleet**.
5. Register or select the screen and choose **Generate pairing code**.
6. Enter the six-digit code on the TV/player.
7. The player stores the issued screen-scoped credential locally and begins polling the active published menu.

A code is single-use and expires after ten minutes.

## 4. Network validation

Wired Ethernet is preferred for permanent deli installations.

Verify:

```bash
ip address
ip route
ping -c 3 1.1.1.1
curl -I "$MENUBOARD_URL"
```

For Wi-Fi, use Raspberry Pi Imager during imaging or the Raspberry Pi desktop/raspi-config tools in the field. Do not place customer Wi-Fi passwords in Git, Notion, device labels, screenshots, or ticket comments.

## 5. Power-cycle acceptance test

Before leaving the site:

1. Confirm a published menu is visible.
2. Disconnect Internet temporarily; the last known-good menu must remain visible.
3. Restore Internet; the player must reconnect and resume polling.
4. Publish a harmless test change; the player must switch to the new immutable version.
5. Remove AC power from the Pi for at least 10 seconds.
6. Restore power.
7. Confirm the Pi returns to Chromium kiosk mode without keyboard/mouse input.
8. Confirm the same paired screen returns to the assigned MenuBoard content.
9. Confirm Command Center shows a recent heartbeat/last-seen time and displayed publish version.

## 6. Replace or re-pair a failed player

If a Pi or storage device is replaced:

1. In Command Center, revoke the old screen credential.
2. Provision the replacement Pi with this same procedure.
3. Boot the replacement to the pairing page.
4. Generate a new pairing code for the screen.
5. Pair the replacement.
6. Confirm the active published menu and heartbeat.
7. Remove or securely wipe the failed storage device when appropriate.

Never copy a raw player token from one Pi to another.

## 7. Field label format

Use a durable label on the back of the Pi and, when practical, behind the TV.

Suggested format:

```text
NetworkConnectIT MenuBoard
Store: DELI01
Screen: SCREEN01
Device: nci-deli01-screen01
HDMI: TV-01
Support: networkconnectit.com
```

Do not print pairing codes, passwords, Wi-Fi credentials, or player tokens on the device label.

## 8. Pilot rollback

If a newly published menu is incorrect, use the MenuBoard menu editor publish history to roll assigned screens back to a prior immutable version. Do not edit the database manually and do not overwrite the cached player payload on the Pi.

## 9. Troubleshooting

If Chromium does not launch, inspect:

```bash
cat ~/.config/labwc/autostart
~/bin/networkconnectit-menuboard-kiosk.sh
command -v chromium
```

If the screen is paired but has no menu, confirm that:

- the screen is assigned to the intended menu;
- that menu has at least one published version;
- the active publish is bound to the screen;
- the player can reach the MenuBoard API;
- the credential has not been revoked.

If Internet is unavailable, do not repeatedly re-pair. A previously loaded player should continue to display its last known-good cached menu.
