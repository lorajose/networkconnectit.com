import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const provision = readFileSync(
  join(
    process.cwd(),
    "scripts",
    "menuboard-pi",
    "provision.sh"
  ),
  "utf8"
);

test("Raspberry Pi provisioning uses current labwc kiosk path", () => {
  assert.match(provision, /\.config\/labwc\/autostart/);
  assert.match(provision, /chromium/);
  assert.match(provision, /--kiosk/);
  assert.match(provision, /while true/);
});

test("Raspberry Pi provisioning disables screen blanking and boots desktop automatically", () => {
  assert.match(provision, /do_boot_behaviour B4/);
  assert.match(provision, /do_blanking 1/);
  assert.match(provision, /consoleblank=0/);
});

test("Raspberry Pi provisioning never embeds player credentials", () => {
  assert.doesNotMatch(provision, /playerToken/i);
  assert.doesNotMatch(provision, /pairingCode/i);
  assert.match(provision, /MENUBOARD_URL/);
});
