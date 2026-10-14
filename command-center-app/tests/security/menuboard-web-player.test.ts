import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const player = readFileSync(
  join(process.cwd(), "components", "menuboard", "web-player.tsx"),
  "utf8"
);
const worker = readFileSync(
  join(process.cwd(), "public", "menuboard-player-sw.js"),
  "utf8"
);

test("web player keeps only a verified last-known-good published payload for outages", () => {
  assert.match(player, /CACHE_KEY/);
  assert.match(player, /localStorage\.setItem\(CACHE_KEY/);
  assert.match(player, /verifyContentIntegrity\(parsed\)/);
  assert.match(player, /Showing verified cached menu while reconnecting/);
  assert.match(player, /Offline · showing last known-good menu/);
});

test("revoked credentials clear cached tenant content before recovery", () => {
  assert.match(player, /response\.status === 401/);
  assert.match(player, /localStorage\.removeItem\(CACHE_KEY\)/);
  assert.match(player, /setContent\(null\)/);
  assert.match(player, /Pair this screen again/);
});

test("service worker caches player shell and assets but never MenuBoard APIs", () => {
  assert.match(worker, /networkFirstNavigation/);
  assert.match(worker, /cacheFirstAsset/);
  assert.match(worker, /\/api\/menuboard\//);
  assert.match(worker, /if \(isMenuBoardApi\(url\)\) \{\s*return;/);
});
