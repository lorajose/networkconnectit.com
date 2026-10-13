import assert from "node:assert/strict";
import test from "node:test";

import { checkMenuBoardPairingRateLimit } from "../../lib/menuboard/pairing-rate-limit";

test("pairing limiter blocks brute-force attempts inside the short window", () => {
  const key = "test-client-a";
  const start = 1_000_000;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    assert.equal(
      checkMenuBoardPairingRateLimit(key, start + attempt).allowed,
      true
    );
  }

  const blocked = checkMenuBoardPairingRateLimit(key, start + 12);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);
});

test("pairing limiter resets after the abuse window expires", () => {
  const key = "test-client-b";
  const start = 2_000_000;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    checkMenuBoardPairingRateLimit(key, start + attempt);
  }

  assert.equal(
    checkMenuBoardPairingRateLimit(key, start + 60_001).allowed,
    true
  );
});
