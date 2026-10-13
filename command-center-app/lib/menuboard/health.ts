export const MENU_BOARD_ONLINE_WINDOW_MS = 90_000;
export const MENU_BOARD_STALE_WINDOW_MS = 5 * 60_000;

export type MenuBoardConnectivityState =
  | "UNPAIRED"
  | "REVOKED"
  | "ONLINE"
  | "STALE"
  | "OFFLINE";

export function getMenuBoardConnectivityState(
  input: {
    paired: boolean;
    revoked: boolean;
    lastSeenAt: Date | null;
  },
  now = new Date()
): MenuBoardConnectivityState {
  if (input.revoked) {
    return "REVOKED";
  }

  if (!input.paired) {
    return "UNPAIRED";
  }

  if (!input.lastSeenAt) {
    return "OFFLINE";
  }

  const ageMs = Math.max(0, now.getTime() - input.lastSeenAt.getTime());

  if (ageMs <= MENU_BOARD_ONLINE_WINDOW_MS) {
    return "ONLINE";
  }

  if (ageMs <= MENU_BOARD_STALE_WINDOW_MS) {
    return "STALE";
  }

  return "OFFLINE";
}

export function isDisplayedPublishCurrent(
  displayedPublishVersion: number | null,
  expectedPublishVersion: number | null
) {
  if (expectedPublishVersion === null) {
    return displayedPublishVersion === null;
  }

  return displayedPublishVersion === expectedPublishVersion;
}
