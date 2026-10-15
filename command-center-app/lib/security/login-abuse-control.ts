import { createHash } from "node:crypto";

const MAX_TRACKED_KEYS = 10_000;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 60_000;

type AttemptState = { failures: number; firstFailureAt: number; blockedUntil: number };
const attempts = new Map<string, AttemptState>();

function keyFor(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function prune(now: number) {
  if (attempts.size < MAX_TRACKED_KEYS) return;
  for (const [key, state] of attempts) {
    if (now - state.firstFailureAt > FAILURE_WINDOW_MS) attempts.delete(key);
    if (attempts.size < MAX_TRACKED_KEYS) break;
  }
  if (attempts.size >= MAX_TRACKED_KEYS) attempts.delete(attempts.keys().next().value as string);
}

export function isLoginTemporarilyBlocked(email: string, now = Date.now()) {
  const state = attempts.get(keyFor(email));
  if (!state) return false;
  if (now - state.firstFailureAt > FAILURE_WINDOW_MS) {
    attempts.delete(keyFor(email));
    return false;
  }
  return state.blockedUntil > now;
}

export function recordLoginFailure(email: string, now = Date.now()) {
  prune(now);
  const key = keyFor(email);
  const prior = attempts.get(key);
  const state = !prior || now - prior.firstFailureAt > FAILURE_WINDOW_MS
    ? { failures: 0, firstFailureAt: now, blockedUntil: now }
    : prior;
  state.failures += 1;
  const backoff = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, state.failures - 1));
  state.blockedUntil = now + backoff;
  attempts.set(key, state);
}

export function clearLoginFailures(email: string) {
  attempts.delete(keyFor(email));
}
