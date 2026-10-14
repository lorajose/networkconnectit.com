export const MENU_BOARD_ONLINE_WINDOW_MS = 90_000;
export const MENU_BOARD_STALE_WINDOW_MS = 5 * 60_000;

export type MenuBoardConnectivityState = "UNPAIRED" | "REVOKED" | "ONLINE" | "STALE" | "OFFLINE";

export function getMenuBoardConnectivityState(input: { paired: boolean; revoked: boolean; lastSeenAt: Date | null }, now = new Date()): MenuBoardConnectivityState {
  if (input.revoked) return "REVOKED";
  if (!input.paired) return "UNPAIRED";
  if (!input.lastSeenAt) return "OFFLINE";
  const ageMs = Math.max(0, now.getTime() - input.lastSeenAt.getTime());
  if (ageMs <= MENU_BOARD_ONLINE_WINDOW_MS) return "ONLINE";
  if (ageMs <= MENU_BOARD_STALE_WINDOW_MS) return "STALE";
  return "OFFLINE";
}

export function isDisplayedPublishCurrent(displayedPublishVersion: number | null, expectedPublishVersion: number | null) {
  if (expectedPublishVersion === null) return displayedPublishVersion === null;
  return displayedPublishVersion === expectedPublishVersion;
}

export type MenuBoardWallZoneStatus = "CURRENT" | "UPDATE_PENDING" | "NOT_PUBLISHED" | "NO_HEARTBEAT" | "INVALID_HEARTBEAT";
export type MenuBoardDisplayedWallZone = { position: number; role: string; version: number; payloadHash: string };

export function parseMenuBoardDisplayedWallZones(value: unknown): { valid: boolean; zones: MenuBoardDisplayedWallZone[] } {
  if (!Array.isArray(value)) return { valid: false, zones: [] };
  const zones: MenuBoardDisplayedWallZone[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return { valid: false, zones: [] };
    const zone = entry as Partial<MenuBoardDisplayedWallZone>;
    if (typeof zone.position !== "number" || typeof zone.role !== "string" || !Number.isSafeInteger(zone.version) || (zone.version ?? 0) < 1 || typeof zone.payloadHash !== "string" || !/^[a-f0-9]{64}$/i.test(zone.payloadHash)) return { valid: false, zones: [] };
    zones.push({ position: zone.position, role: zone.role, version: zone.version, payloadHash: zone.payloadHash });
  }
  return { valid: true, zones };
}

export function getMenuBoardWallZoneStatus(input: { expectedVersion: number | null; expectedHash: string | null; heartbeatPresent: boolean; heartbeatValid: boolean; displayed?: MenuBoardDisplayedWallZone | null }): MenuBoardWallZoneStatus {
  if (input.expectedVersion === null || input.expectedHash === null) return "NOT_PUBLISHED";
  if (!input.heartbeatPresent) return "NO_HEARTBEAT";
  if (!input.heartbeatValid) return "INVALID_HEARTBEAT";
  if (!input.displayed) return "UPDATE_PENDING";
  return input.displayed.version === input.expectedVersion && input.displayed.payloadHash.toLowerCase() === input.expectedHash.toLowerCase() ? "CURRENT" : "UPDATE_PENDING";
}
