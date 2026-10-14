import assert from "node:assert/strict";
import test from "node:test";

import {
  expectedContentTypeForRole,
  isMenuBoardWallManifest,
  MENU_BOARD_WALL_ZONE_COUNT,
} from "../../lib/menuboard/wall-types";

const hash = "a".repeat(64);

function validManifest() {
  return {
    schemaVersion: 1,
    displayGroup: { id: "group-1", name: "Deli Wall" },
    zones: [
      {
        position: 1,
        role: "MENU_PRIMARY",
        content: {
          contentType: "MENU",
          publishId: "menu-publish-1",
          version: 4,
          payloadHash: hash,
          payload: { menu: "primary" },
        },
      },
      {
        position: 2,
        role: "MENU_SECONDARY",
        content: {
          contentType: "MENU",
          publishId: "menu-publish-2",
          version: 8,
          payloadHash: hash,
          payload: { menu: "secondary" },
        },
      },
      {
        position: 3,
        role: "PROMOTION",
        content: {
          contentType: "PROMOTION",
          publishId: "promo-publish-1",
          version: 2,
          payloadHash: hash,
          slides: [
            {
              id: "promo-1",
              headline: "Lunch Special",
              offerText: "$9.99",
              durationSeconds: 10,
            },
          ],
        },
      },
    ],
  };
}

test("NCI-094 wall contract is exactly three zones", () => {
  assert.equal(MENU_BOARD_WALL_ZONE_COUNT, 3);
  assert.equal(isMenuBoardWallManifest(validManifest()), true);
});

test("NCI-094 maps menu roles to MENU and promotion role to PROMOTION", () => {
  assert.equal(expectedContentTypeForRole("MENU_PRIMARY"), "MENU");
  assert.equal(expectedContentTypeForRole("MENU_SECONDARY"), "MENU");
  assert.equal(expectedContentTypeForRole("PROMOTION"), "PROMOTION");
});

test("NCI-094 rejects duplicate zone positions", () => {
  const manifest = validManifest();
  manifest.zones[1].position = 1;
  assert.equal(isMenuBoardWallManifest(manifest), false);
});

test("NCI-094 rejects promotion content placed in a menu zone", () => {
  const manifest = validManifest();
  manifest.zones[0].content = manifest.zones[2].content;
  assert.equal(isMenuBoardWallManifest(manifest), false);
});

test("NCI-094 rejects a third menu in place of the promotion zone", () => {
  const manifest = validManifest();
  manifest.zones[2].content = manifest.zones[0].content;
  assert.equal(isMenuBoardWallManifest(manifest), false);
});

test("NCI-094 rejects unsafe promotion rotation durations", () => {
  const manifest = validManifest();
  manifest.zones[2].content.slides[0].durationSeconds = 1;
  assert.equal(isMenuBoardWallManifest(manifest), false);
});
