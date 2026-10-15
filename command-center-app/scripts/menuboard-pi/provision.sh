#!/usr/bin/env bash
set -euo pipefail

MENUBOARD_URL="${MENUBOARD_URL:-}"
DEVICE_LABEL="${NCI_DEVICE_LABEL:-}"
TARGET_USER="${SUDO_USER:-${USER}}"
TARGET_HOME="$(getent passwd "${TARGET_USER}" | cut -d: -f6)"

if [[ -z "${MENUBOARD_URL}" ]]; then
  echo "MENUBOARD_URL is required."
  echo "Example: MENUBOARD_URL='https://example.com/tools/command-center/menuboard/player' sudo -E ./provision.sh"
  exit 1
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script with sudo -E so Raspberry Pi system settings can be applied."
  exit 1
fi

if [[ ! -d "${TARGET_HOME}" ]]; then
  echo "Could not resolve the desktop user's home directory."
  exit 1
fi

echo "Configuring NetworkConnectIT MenuBoard kiosk for user ${TARGET_USER}..."

apt-get update
apt-get install -y ca-certificates curl

if ! command -v chromium >/dev/null 2>&1; then
  apt-get install -y chromium
fi

if command -v raspi-config >/dev/null 2>&1; then
  raspi-config nonint do_boot_behaviour B4
  raspi-config nonint do_blanking 1
  raspi-config nonint do_boot_wait 0

  if [[ -n "${DEVICE_LABEL}" ]]; then
    safe_hostname="$(echo "${DEVICE_LABEL}" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-' | sed 's/^-*//;s/-*$//' | cut -c1-63)"
    if [[ -n "${safe_hostname}" ]]; then
      raspi-config nonint do_hostname "${safe_hostname}"
    fi
  fi
fi

install -d -m 0755 -o "${TARGET_USER}" -g "${TARGET_USER}" "${TARGET_HOME}/bin"
install -d -m 0755 -o "${TARGET_USER}" -g "${TARGET_USER}" "${TARGET_HOME}/.config/labwc"
install -d -m 0755 -o "${TARGET_USER}" -g "${TARGET_USER}" "${TARGET_HOME}/Desktop"

cat > "${TARGET_HOME}/bin/networkconnectit-menuboard-kiosk.sh" <<EOF
#!/usr/bin/env bash
set -u

MENUBOARD_URL='${MENUBOARD_URL}'

while true; do
  chromium \
    "${MENUBOARD_URL}" \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --no-first-run \
    --disable-session-crashed-bubble \
    --disable-pinch \
    --overscroll-history-navigation=0 \
    --start-maximized

  sleep 2
done
EOF

chmod 0755 "${TARGET_HOME}/bin/networkconnectit-menuboard-kiosk.sh"
chown "${TARGET_USER}:${TARGET_USER}" "${TARGET_HOME}/bin/networkconnectit-menuboard-kiosk.sh"

AUTOSTART="${TARGET_HOME}/.config/labwc/autostart"
touch "${AUTOSTART}"
chown "${TARGET_USER}:${TARGET_USER}" "${AUTOSTART}"

START_LINE="${TARGET_HOME}/bin/networkconnectit-menuboard-kiosk.sh &"
if ! grep -Fq "${START_LINE}" "${AUTOSTART}"; then
  printf '\n# NetworkConnectIT MenuBoard\n%s\n' "${START_LINE}" >> "${AUTOSTART}"
fi

if [[ -f /boot/firmware/cmdline.txt ]] && ! grep -qw "consoleblank=0" /boot/firmware/cmdline.txt; then
  sed -i '1 s/$/ consoleblank=0/' /boot/firmware/cmdline.txt
fi

cat > "${TARGET_HOME}/Desktop/MenuBoard-Player.txt" <<EOF
NetworkConnectIT MenuBoard
Player URL: ${MENUBOARD_URL}
Device label: ${DEVICE_LABEL:-not-set}

After reboot:
1. Chromium opens automatically in kiosk mode.
2. Enter the six-digit pairing code shown in Command Center.
3. The player stores its screen credential locally and resumes automatically.
EOF

chown "${TARGET_USER}:${TARGET_USER}" "${TARGET_HOME}/Desktop/MenuBoard-Player.txt" 2>/dev/null || true

echo
echo "Provisioning complete."
echo "Reboot to validate automatic desktop login and MenuBoard kiosk launch:"
echo "  sudo reboot"
