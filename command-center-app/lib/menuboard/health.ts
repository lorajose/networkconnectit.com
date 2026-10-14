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

const WALL_ZONE_ROLE_BY_POSITION = {
  1: "MENU_PRIMARY",
  2: "MENU_SECONDARY",
  3: "PROMOTION",
} as const;

export function parseMenuBoardDisplayedWallZones(value: unknown): { valid: boolean; zones: MenuBoardDisplayedWallZone[] } {
  if (!Array.isArray(value) || value.length > 3) return { valid: false, zones: [] };
  const zones: MenuBoardDisplayedWallZone[] = [];
  const seenPositions = new Set<number>();
  const seenRoles = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return { valid: false, zones: [] };
    const zone = entry as Partial<MenuBoardDisplayedWallZone>;
    const position = zone.position;
    const role = zone.role;
    const version = zone.version;
    if (
      typeof position !== "number" ||
      !Number.isSafeInteger(position) ||
      !(position in WALL_ZONE_ROLE_BY_POSITION) ||
      typeof role !== "string" ||
      WALL_ZONE_ROLE_BY_POSITION[position as keyof typeof WALL_ZONE_ROLE_BY_POSITION] !== role ||
      seenPositions.has(position) ||
      seenRoles.has(role) ||
      typeof version !== "number" ||
      !Number.isSafeInteger(version) ||
      version < 1 ||
      typeof zone.payloadHash !== "string" ||
      !/^[a-f0-9]{64}$/i.test(zone.payloadHash)
    ) return { valid: false, zones: [] };
    seenPositions.add(position);
    seenRoles.add(role);
    zones.push({ position, role, version, payloadHash: zone.payloadHash });
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
