import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  isMenuBoardPlayerContent,
  isMenuBoardPublishPayload,
  serializeMenuBoardPublishPayload,
  verifyMenuBoardPublishPayloadHash,
  type MenuBoardPublishPayload
} from "../../lib/menuboard/player-types";

const validPayload: MenuBoardPublishPayload = {
  schemaVersion: 1,
  templateKey: "DELI_LANDSCAPE_V1",
  menuId: "menu-1",
  menuName: "Main Menu",
  storeDisplayName: "Pilot Deli",
  logoUrl: null,
  promotionTitle: "Lunch Special",
  promotionText: "Hero + soda",
  currency: "USD",
  sections: [
    {
      id: "section-1",
      name: "Sandwiches",
      items: [
        {
          id: "item-1",
          name: "Turkey Hero",
          description: null,
          priceCents: 999,
          imageUrl: null
        }
      ]
    }
  ]
};

test("published payload validator accepts the supported v1 contract", () => {
  assert.equal(isMenuBoardPublishPayload(validPayload), true);
});

test("published payload validator rejects malformed and oversized data", () => {
  assert.equal(
    isMenuBoardPublishPayload({
      ...validPayload,
      schemaVersion: 2
    }),
    false
  );

  assert.equal(
    isMenuBoardPublishPayload({
      ...validPayload,
      sections: [
        {
          ...validPayload.sections[0],
          items: [
            {
              ...validPayload.sections[0].items[0],
              priceCents: -1
            }
          ]
        }
      ]
    }),
    false
  );

  assert.equal(
    isMenuBoardPublishPayload({
      ...validPayload,
      sections: Array.from({ length: 13 }, (_, index) => ({
        id: `section-${index}`,
        name: "Section",
        items: []
      }))
    }),
    false
  );
});

test("public player response excludes tenant identifiers and validates active publish hash", () => {
  const content = {
    screen: {
      id: "screen-1",
      name: "Front Counter",
      orientation: "LANDSCAPE",
      widthPx: 1920,
      heightPx: 1080,
      status: "ONLINE"
    },
    menuId: "menu-1",
    activePublish: {
      id: "publish-1",
      version: 1,
      payload: validPayload,
      payloadHash: "a".repeat(64),
      publishedAt: "2026-10-13T20:00:00.000Z"
    }
  };

  assert.equal(isMenuBoardPlayerContent(content), true);
  assert.equal("organizationId" in content.screen, false);
  assert.equal("siteId" in content.screen, false);

  assert.equal(
    isMenuBoardPlayerContent({
      ...content,
      activePublish: {
        ...content.activePublish,
        payloadHash: "not-a-sha256"
      }
    }),
    false
  );
});


test("player verifies the SHA-256 hash of published content before trusting it", async () => {
  const expected = createHash("sha256")
    .update(serializeMenuBoardPublishPayload(validPayload), "utf8")
    .digest("hex");

  assert.equal(
    await verifyMenuBoardPublishPayloadHash(validPayload, expected),
    true
  );
  assert.equal(
    await verifyMenuBoardPublishPayloadHash(
      { ...validPayload, menuName: "Tampered Menu" },
      expected
    ),
    false
  );
});
