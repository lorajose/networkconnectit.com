import assert from "node:assert/strict";
import test from "node:test";

import {
  MENU_BOARD_PAIRING_CODE_TTL_MS,
  generatePairingCode,
  generatePlayerToken,
  getPairingCodeExpiry,
  hashMenuBoardSecret,
  isPairingCodeExpired,
  normalizePairingCode
} from "../../lib/menuboard/security";

test("pairing codes are six digits and normalize presentation separators", () => {
  for (let index = 0; index < 100; index += 1) {
    assert.match(generatePairingCode(), /^\d{6}$/);
  }
  assert.equal(normalizePairingCode("123 456"), "123456");
  assert.equal(normalizePairingCode("123-456"), "123456");
});

test("player tokens have enough entropy and hashes do not persist the raw secret", () => {
  const first = generatePlayerToken();
  const second = generatePlayerToken();
  assert.notEqual(first, second);
  assert.ok(first.length >= 40);

  const hash = hashMenuBoardSecret(first);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(hash, first);
  assert.equal(hashMenuBoardSecret(first), hash);
});

test("pairing expiry is short lived and deterministic", () => {
  const now = new Date("2026-10-13T20:00:00.000Z");
  const expiresAt = getPairingCodeExpiry(now);
  assert.equal(
    expiresAt.getTime() - now.getTime(),
    MENU_BOARD_PAIRING_CODE_TTL_MS
  );
  assert.equal(isPairingCodeExpired(expiresAt, now), false);
  assert.equal(isPairingCodeExpired(expiresAt, expiresAt), true);
});
