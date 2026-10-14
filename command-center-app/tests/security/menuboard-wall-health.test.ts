import assert from "node:assert/strict";
import test from "node:test";

import { getMenuBoardWallZoneStatus, parseMenuBoardDisplayedWallZones } from "../../lib/menuboard/health";

const expectedHash = "a".repeat(64);
const otherHash = "b".repeat(64);

function displayed(payloadHash = expectedHash, version = 4) {
  return { position: 1, role: "MENU_PRIMARY", version, payloadHash };
}

test("NCI-094 wall zone is current only when version and hash match", () => {
  assert.equal(getMenuBoardWallZoneStatus({ expectedVersion: 4, expectedHash, heartbeatPresent: true, heartbeatValid: true, displayed: displayed() }), "CURRENT");
  assert.equal(getMenuBoardWallZoneStatus({ expectedVersion: 4, expectedHash, heartbeatPresent: true, heartbeatValid: true, displayed: displayed(otherHash) }), "UPDATE_PENDING");
  assert.equal(getMenuBoardWallZoneStatus({ expectedVersion: 4, expectedHash, heartbeatPresent: true, heartbeatValid: true, displayed: displayed(expectedHash, 3) }), "UPDATE_PENDING");
});

test("NCI-094 wall zone distinguishes no heartbeat and invalid heartbeat", () => {
  assert.equal(getMenuBoardWallZoneStatus({ expectedVersion: 4, expectedHash, heartbeatPresent: false, heartbeatValid: false }), "NO_HEARTBEAT");
  assert.equal(getMenuBoardWallZoneStatus({ expectedVersion: 4, expectedHash, heartbeatPresent: true, heartbeatValid: false }), "INVALID_HEARTBEAT");
});

test("NCI-094 unpublished wall zone does not report pending", () => {
  assert.equal(getMenuBoardWallZoneStatus({ expectedVersion: null, expectedHash: null, heartbeatPresent: false, heartbeatValid: false }), "NOT_PUBLISHED");
});

test("NCI-094 rejects malformed displayed-zone heartbeat payloads atomically", () => {
  const valid = parseMenuBoardDisplayedWallZones([displayed(), { position: 2, role: "MENU_SECONDARY", version: 7, payloadHash: expectedHash }]);
  assert.equal(valid.valid, true);
  assert.equal(valid.zones.length, 2);

  const malformed = parseMenuBoardDisplayedWallZones([displayed(), { position: 2, role: "MENU_SECONDARY", version: 7, payloadHash: "bad" }]);
  assert.equal(malformed.valid, false);
  assert.deepEqual(malformed.zones, []);
});


test("NCI-094 rejects duplicate and non-canonical wall zone mappings", () => {
  const duplicatePosition = parseMenuBoardDisplayedWallZones([
    displayed(),
    { position: 1, role: "MENU_PRIMARY", version: 5, payloadHash: otherHash },
  ]);
  assert.equal(duplicatePosition.valid, false);

  const duplicateRole = parseMenuBoardDisplayedWallZones([
    displayed(),
    { position: 2, role: "MENU_PRIMARY", version: 5, payloadHash: otherHash },
  ]);
  assert.equal(duplicateRole.valid, false);

  const mismatchedRole = parseMenuBoardDisplayedWallZones([
    { position: 3, role: "MENU_SECONDARY", version: 5, payloadHash: expectedHash },
  ]);
  assert.equal(mismatchedRole.valid, false);

  const outOfRange = parseMenuBoardDisplayedWallZones([
    { position: 4, role: "PROMOTION", version: 5, payloadHash: expectedHash },
  ]);
  assert.equal(outOfRange.valid, false);
});
