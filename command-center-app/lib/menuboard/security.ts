import { createHash, randomBytes, randomInt } from "node:crypto";

export const MENU_BOARD_PAIRING_CODE_TTL_MS = 10 * 60 * 1000;

export function normalizePairingCode(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export function generatePairingCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function generatePlayerToken() {
  return randomBytes(32).toString("base64url");
}

export function hashMenuBoardSecret(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function getPairingCodeExpiry(now = new Date()) {
  return new Date(now.getTime() + MENU_BOARD_PAIRING_CODE_TTL_MS);
}

export function isPairingCodeExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() <= now.getTime();
}
