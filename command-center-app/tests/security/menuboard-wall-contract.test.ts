import assert from "node:assert/strict";
import test from "node:test";

import {
  expectedContentTypeForRole,
  isMenuBoardPromotionPublishPayload,
  isMenuBoardWallManifest,
  MENU_BOARD_WALL_ZONE_COUNT,
  serializeMenuBoardPromotionPublishPayload,
  serializeMenuBoardWallManifestForHash,
} from "../../lib/menuboard/wall-types";

const hash = "a".repeat(64);

function validManifest() {
  return {
    schemaVersion: 1,
    manifestHash: hash,
    displayGroup: { id: "group-1", name: "Deli Wall" },
    zones: [
      { position: 1, role: "MENU_PRIMARY", content: { contentType: "MENU", publishId: "menu-publish-1", version: 4, payloadHash: hash, payload: { menu: "primary" } } },
      { position: 2, role: "MENU_SECONDARY", content: { contentType: "MENU", publishId: "menu-publish-2", version: 8, payloadHash: hash, payload: { menu: "secondary" } } },
      { position: 3, role: "PROMOTION", content: { contentType: "PROMOTION", publishId: "promo-publish-1", version: 2, payloadHash: hash, slides: [{ id: "promo-1", headline: "Lunch Special", offerText: "$9.99", durationSeconds: 10 }] } },
    ],
  };
}

test("NCI-094 wall contract is exactly three zones", () => {
  assert.equal(MENU_BOARD_WALL_ZONE_COUNT, 3);
  assert.equal(isMenuBoardWallManifest(validManifest()), true);
});

test("NCI-094 wall manifest requires a SHA-256 manifest hash", () => {
  const manifest = validManifest();
  manifest.manifestHash = "invalid";
  assert.equal(isMenuBoardWallManifest(manifest), false);
});

test("NCI-094 maps menu roles to MENU and promotion role to PROMOTION", () => {
  assert.equal(expectedContentTypeForRole("MENU_PRIMARY"), "MENU");
  assert.equal(expectedContentTypeForRole("MENU_SECONDARY"), "MENU");
  assert.equal(expectedContentTypeForRole("PROMOTION"), "PROMOTION");
});

test("NCI-094 rejects duplicate zone positions", () => { const manifest = validManifest(); manifest.zones[1].position = 1; assert.equal(isMenuBoardWallManifest(manifest), false); });
test("NCI-094 rejects promotion content placed in a menu zone", () => { const manifest = validManifest(); manifest.zones[0].content = manifest.zones[2].content; assert.equal(isMenuBoardWallManifest(manifest), false); });
test("NCI-094 rejects a third menu in place of the promotion zone", () => { const manifest = validManifest(); manifest.zones[2].content = manifest.zones[0].content; assert.equal(isMenuBoardWallManifest(manifest), false); });

test("NCI-094 rejects unsafe promotion rotation durations", () => {
  const manifest = validManifest(); const promotionContent = manifest.zones[2]?.content;
  assert.equal(promotionContent?.contentType, "PROMOTION");
  if (!promotionContent || promotionContent.contentType !== "PROMOTION") assert.fail("Expected promotion content in the valid wall manifest fixture.");
  const firstSlide = promotionContent.slides?.[0]; if (!firstSlide) assert.fail("Expected a promotion slide in the valid wall manifest fixture.");
  firstSlide.durationSeconds = 1; assert.equal(isMenuBoardWallManifest(manifest), false);
});

test("NCI-094 validates promotion publish payloads", () => {
  const payload = { schemaVersion: 1, campaignId: "campaign-1", campaignName: "Deli Offers", slides: [{ id: "slide-1", headline: "Lunch Special", offerText: "$9.99", durationSeconds: 10 }] };
  assert.equal(isMenuBoardPromotionPublishPayload(payload), true);
  assert.equal(isMenuBoardPromotionPublishPayload({ ...payload, slides: [{ ...payload.slides[0], durationSeconds: 1 }] }), false);
});

test("NCI-094 canonical promotion serialization is key-order stable", () => {
  const left = { schemaVersion: 1 as const, campaignId: "campaign-1", campaignName: "Deli Offers", slides: [{ id: "slide-1", headline: "Lunch Special", body: "Fresh every day", offerText: "$9.99", mediaUrl: "/promo.jpg", durationSeconds: 10 }] };
  const right = { campaignName: "Deli Offers", campaignId: "campaign-1", schemaVersion: 1 as const, slides: [{ durationSeconds: 10, mediaUrl: "/promo.jpg", offerText: "$9.99", body: "Fresh every day", headline: "Lunch Special", id: "slide-1" }] };
  assert.equal(serializeMenuBoardPromotionPublishPayload(left), serializeMenuBoardPromotionPublishPayload(right));
});

test("NCI-094 canonical wall manifest serialization is key-order stable", () => {
  const left = { schemaVersion: 1 as const, displayGroup: { id: "group-1", name: "Deli Wall" }, zones: validManifest().zones };
  const right = { zones: validManifest().zones, displayGroup: { name: "Deli Wall", id: "group-1" }, schemaVersion: 1 as const };
  assert.equal(serializeMenuBoardWallManifestForHash(left), serializeMenuBoardWallManifestForHash(right));
});
