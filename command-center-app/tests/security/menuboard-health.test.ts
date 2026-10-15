import assert from "node:assert/strict";
import test from "node:test";

import {
  MENU_BOARD_ONLINE_WINDOW_MS,
  MENU_BOARD_STALE_WINDOW_MS,
  getMenuBoardConnectivityState,
  isDisplayedPublishCurrent
} from "../../lib/menuboard/health";

test("screen connectivity distinguishes online stale and offline windows", () => {
  const now = new Date("2026-10-13T20:00:00.000Z");

  assert.equal(
    getMenuBoardConnectivityState(
      {
        paired: true,
        revoked: false,
        lastSeenAt: new Date(now.getTime() - MENU_BOARD_ONLINE_WINDOW_MS)
      },
      now
    ),
    "ONLINE"
  );

  assert.equal(
    getMenuBoardConnectivityState(
      {
        paired: true,
        revoked: false,
        lastSeenAt: new Date(now.getTime() - MENU_BOARD_ONLINE_WINDOW_MS - 1)
      },
      now
    ),
    "STALE"
  );

  assert.equal(
    getMenuBoardConnectivityState(
      {
        paired: true,
        revoked: false,
        lastSeenAt: new Date(now.getTime() - MENU_BOARD_STALE_WINDOW_MS - 1)
      },
      now
    ),
    "OFFLINE"
  );
});

test("unpaired and revoked states fail closed regardless of heartbeat age", () => {
  const now = new Date("2026-10-13T20:00:00.000Z");

  assert.equal(
    getMenuBoardConnectivityState(
      { paired: false, revoked: false, lastSeenAt: now },
      now
    ),
    "UNPAIRED"
  );

  assert.equal(
    getMenuBoardConnectivityState(
      { paired: true, revoked: true, lastSeenAt: now },
      now
    ),
    "REVOKED"
  );
});

test("displayed version must match the active publish exactly", () => {
  assert.equal(isDisplayedPublishCurrent(4, 4), true);
  assert.equal(isDisplayedPublishCurrent(3, 4), false);
  assert.equal(isDisplayedPublishCurrent(null, 4), false);
  assert.equal(isDisplayedPublishCurrent(null, null), true);
});
