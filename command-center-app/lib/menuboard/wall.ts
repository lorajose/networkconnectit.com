import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getScopedRecordWhere, resolveWritableOrganizationId, type TenantUser } from "@/lib/management/tenant-policy";
import { generatePairingCode, generatePlayerToken, getPairingCodeExpiry, hashMenuBoardSecret, isPairingCodeExpired, normalizePairingCode } from "@/lib/menuboard/security";
import { isMenuBoardPublishPayload } from "@/lib/menuboard/player-types";
import { expectedContentTypeForRole, isMenuBoardPromotionPublishPayload, isMenuBoardWallManifest, serializeMenuBoardWallManifestForHash, type MenuBoardWallManifest, type MenuBoardWallZoneManifest } from "@/lib/menuboard/wall-types";

export type CreateMenuBoardDisplayGroupInput = { organizationId?: string | null; siteId: string; name: string };
const WALL_ZONE_BLUEPRINT = [
  { position: 1, role: "MENU_PRIMARY", contentType: "MENU" },
  { position: 2, role: "MENU_SECONDARY", contentType: "MENU" },
  { position: 3, role: "PROMOTION", contentType: "PROMOTION" },
] as const;

export async function listMenuBoardDisplayGroups(user: TenantUser) {
  return prisma.menuBoardDisplayGroup.findMany({
    where: getScopedRecordWhere(user), orderBy: [{ site: { name: "asc" } }, { name: "asc" }],
    select: { id: true, name: true, lastSeenAt: true, playerTokenIssuedAt: true, playerTokenRevokedAt: true,
      organization: { select: { id: true, name: true } }, site: { select: { id: true, name: true } },
      zones: { orderBy: { position: "asc" }, select: { id: true, position: true, role: true, contentType: true, menu: { select: { id: true, name: true } }, activeMenuPublish: { select: { id: true, version: true, payloadHash: true } }, promotionCampaign: { select: { id: true, name: true } }, activePromotionPublish: { select: { id: true, version: true, payloadHash: true } } } },
      heartbeats: { orderBy: { receivedAt: "desc" }, take: 1, select: { receivedAt: true, playerVersion: true, manifestHash: true, displayedZones: true } },
    },
  });
}

export async function createMenuBoardDisplayGroup(user: TenantUser, input: CreateMenuBoardDisplayGroupInput) {
  const organizationId = resolveWritableOrganizationId(user, input.organizationId); if (!organizationId) throw new Error("A valid organization is required.");
  const site = await prisma.site.findFirst({ where: { id: input.siteId, organizationId, ...getScopedRecordWhere(user) }, select: { id: true } }); if (!site) throw new Error("The selected site is outside your tenant scope.");
  const name = input.name.trim(); if (!name) throw new Error("Display group name is required.");
  return prisma.menuBoardDisplayGroup.create({ data: { organizationId, siteId: site.id, name, zones: { create: WALL_ZONE_BLUEPRINT.map((zone) => ({ organizationId, position: zone.position, role: zone.role, contentType: zone.contentType })) } }, include: { zones: { orderBy: { position: "asc" } } } });
}

export async function issueMenuBoardWallPairingCode(user: TenantUser, displayGroupId: string) {
  const group = await prisma.menuBoardDisplayGroup.findFirst({ where: { id: displayGroupId, ...getScopedRecordWhere(user) }, select: { id: true, organizationId: true } }); if (!group) throw new Error("Display group not found.");
  const now = new Date(); await prisma.menuBoardWallPairingCode.deleteMany({ where: { displayGroupId: group.id, consumedAt: null } });
  for (let attempt = 0; attempt < 5; attempt += 1) { const code = generatePairingCode(); try { const pairing = await prisma.menuBoardWallPairingCode.create({ data: { organizationId: group.organizationId, displayGroupId: group.id, codeHash: hashMenuBoardSecret(code), expiresAt: getPairingCodeExpiry(now) }, select: { expiresAt: true } }); return { code, expiresAt: pairing.expiresAt }; } catch (error) { if ((error as { code?: string }).code !== "P2002") throw error; } }
  throw new Error("Could not allocate a wall pairing code. Try again.");
}

export async function consumeMenuBoardWallPairingCode(rawCode: string) {
  const code = normalizePairingCode(rawCode); if (!/^\d{6}$/.test(code)) return null; const codeHash = hashMenuBoardSecret(code); const now = new Date();
  const candidate = await prisma.menuBoardWallPairingCode.findUnique({ where: { codeHash }, select: { id: true, organizationId: true, displayGroupId: true, expiresAt: true, consumedAt: true } }); if (!candidate || candidate.consumedAt || isPairingCodeExpired(candidate.expiresAt, now)) return null;
  const playerToken = generatePlayerToken(); const playerTokenHash = hashMenuBoardSecret(playerToken);
  const paired = await prisma.$transaction(async (tx) => { const claimed = await tx.menuBoardWallPairingCode.updateMany({ where: { id: candidate.id, consumedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } }); if (claimed.count !== 1) return null; const displayGroup = await tx.menuBoardDisplayGroup.update({ where: { id: candidate.displayGroupId }, data: { playerTokenHash, playerTokenIssuedAt: now, playerTokenRevokedAt: null }, select: { id: true, name: true } }); await tx.menuBoardWallPairingCode.deleteMany({ where: { displayGroupId: candidate.displayGroupId, consumedAt: null } }); return displayGroup; });
  return paired ? { playerToken, displayGroup: paired } : null;
}

export async function revokeMenuBoardWallPlayer(user: TenantUser, displayGroupId: string) { const group = await prisma.menuBoardDisplayGroup.findFirst({ where: { id: displayGroupId, ...getScopedRecordWhere(user) }, select: { id: true } }); if (!group) throw new Error("Display group not found."); const now = new Date(); await prisma.$transaction([prisma.menuBoardWallPairingCode.deleteMany({ where: { displayGroupId: group.id, consumedAt: null } }), prisma.menuBoardDisplayGroup.update({ where: { id: group.id }, data: { playerTokenHash: null, playerTokenIssuedAt: null, playerTokenRevokedAt: now } })]); }
export async function authenticateMenuBoardWallPlayer(rawToken: string) { if (!rawToken) return null; return prisma.menuBoardDisplayGroup.findFirst({ where: { playerTokenHash: hashMenuBoardSecret(rawToken), playerTokenRevokedAt: null }, select: { id: true, organizationId: true, siteId: true, name: true } }); }

export async function getMenuBoardWallPlayerManifest(rawToken: string) {
  const authenticated = await authenticateMenuBoardWallPlayer(rawToken); if (!authenticated) return null;
  const group = await prisma.menuBoardDisplayGroup.findUnique({ where: { id: authenticated.id }, select: { id: true, name: true, organizationId: true, zones: { orderBy: { position: "asc" }, select: { position: true, role: true, contentType: true, menuId: true, promotionCampaignId: true, activeMenuPublish: { select: { id: true, organizationId: true, menuId: true, version: true, payload: true, payloadHash: true } }, activePromotionPublish: { select: { id: true, organizationId: true, campaignId: true, version: true, payload: true, payloadHash: true } } } } } });
  if (!group) return null; const identity = { id: group.id, name: group.name }; if (group.zones.length !== 3) return { displayGroup: identity, manifest: null, malformed: true, incomplete: false }; const manifestZones: MenuBoardWallZoneManifest[] = [];
  for (let index = 0; index < WALL_ZONE_BLUEPRINT.length; index += 1) { const expected = WALL_ZONE_BLUEPRINT[index]; const zone = group.zones[index]; if (!expected || !zone || zone.position !== expected.position || zone.role !== expected.role || zone.contentType !== expected.contentType || zone.contentType !== expectedContentTypeForRole(zone.role)) return { displayGroup: identity, manifest: null, malformed: true, incomplete: false };
    if (zone.contentType === "MENU") { const publish = zone.activeMenuPublish; if (!zone.menuId || !publish) return { displayGroup: identity, manifest: null, malformed: false, incomplete: true }; if (publish.organizationId !== group.organizationId || publish.menuId !== zone.menuId || !isMenuBoardPublishPayload(publish.payload)) return { displayGroup: identity, manifest: null, malformed: true, incomplete: false }; manifestZones.push({ position: zone.position as 1 | 2 | 3, role: zone.role, content: { contentType: "MENU", publishId: publish.id, version: publish.version, payloadHash: publish.payloadHash, payload: publish.payload } }); continue; }
    const publish = zone.activePromotionPublish; if (!zone.promotionCampaignId || !publish) return { displayGroup: identity, manifest: null, malformed: false, incomplete: true }; if (publish.organizationId !== group.organizationId || publish.campaignId !== zone.promotionCampaignId || !isMenuBoardPromotionPublishPayload(publish.payload)) return { displayGroup: identity, manifest: null, malformed: true, incomplete: false }; manifestZones.push({ position: zone.position as 1 | 2 | 3, role: zone.role, content: { contentType: "PROMOTION", publishId: publish.id, version: publish.version, payloadHash: publish.payloadHash, slides: publish.payload.slides } }); }
  const manifestBody: Omit<MenuBoardWallManifest, "manifestHash"> = { schemaVersion: 1, displayGroup: identity, zones: manifestZones as MenuBoardWallManifest["zones"] }; const manifestHash = createHash("sha256").update(serializeMenuBoardWallManifestForHash(manifestBody), "utf8").digest("hex"); const manifest: MenuBoardWallManifest = { ...manifestBody, manifestHash }; if (!isMenuBoardWallManifest(manifest)) return { displayGroup: identity, manifest: null, malformed: true, incomplete: false }; return { displayGroup: identity, manifest, malformed: false, incomplete: false };
}

type WallDisplayedZone = { position: 1 | 2 | 3; role: "MENU_PRIMARY" | "MENU_SECONDARY" | "PROMOTION"; version: number; payloadHash: string };
function isDisplayedZone(value: unknown): value is WallDisplayedZone { if (!value || typeof value !== "object") return false; const candidate = value as Partial<WallDisplayedZone>; return (candidate.position === 1 || candidate.position === 2 || candidate.position === 3) && (candidate.role === "MENU_PRIMARY" || candidate.role === "MENU_SECONDARY" || candidate.role === "PROMOTION") && Number.isSafeInteger(candidate.version) && (candidate.version ?? 0) >= 1 && typeof candidate.payloadHash === "string" && /^[a-f0-9]{64}$/i.test(candidate.payloadHash); }
export async function recordMenuBoardWallHeartbeat(rawToken: string, input: { playerVersion?: string | null; manifestHash?: string | null; displayedZones?: unknown }) { const group = await authenticateMenuBoardWallPlayer(rawToken); if (!group) return null; const displayedZones = Array.isArray(input.displayedZones) && input.displayedZones.length <= 3 && input.displayedZones.every(isDisplayedZone) ? input.displayedZones : null; const manifestHash = typeof input.manifestHash === "string" && /^[a-f0-9]{64}$/i.test(input.manifestHash) ? input.manifestHash : null; const now = new Date(); await prisma.$transaction([prisma.menuBoardDisplayGroup.update({ where: { id: group.id }, data: { lastSeenAt: now } }), prisma.menuBoardWallHeartbeat.create({ data: { organizationId: group.organizationId, displayGroupId: group.id, playerVersion: input.playerVersion?.trim().slice(0, 64) || null, manifestHash, displayedZones: displayedZones === null ? Prisma.JsonNull : (displayedZones as unknown as Prisma.InputJsonValue), receivedAt: now } })]); return { displayGroupId: group.id, receivedAt: now }; }

export async function assignMenuToWallZone(user: TenantUser, input: { displayGroupId: string; role: "MENU_PRIMARY" | "MENU_SECONDARY"; menuId: string }) { const group = await prisma.menuBoardDisplayGroup.findFirst({ where: { id: input.displayGroupId, ...getScopedRecordWhere(user) }, select: { id: true, organizationId: true, siteId: true } }); if (!group) throw new Error("Display group not found."); const menu = await prisma.menu.findFirst({ where: { id: input.menuId, organizationId: group.organizationId, siteId: group.siteId, ...getScopedRecordWhere(user) }, select: { id: true } }); if (!menu) throw new Error("The selected menu is outside this store."); const updated = await prisma.menuBoardDisplayZone.updateMany({ where: { displayGroupId: group.id, organizationId: group.organizationId, role: input.role, contentType: "MENU" }, data: { menuId: menu.id, activeMenuPublishId: null, promotionCampaignId: null, activePromotionPublishId: null } }); if (updated.count !== 1) throw new Error("The requested menu wall zone is unavailable."); }
export async function assignPromotionCampaignToWallZone(user: TenantUser, input: { displayGroupId: string; campaignId: string }) { const group = await prisma.menuBoardDisplayGroup.findFirst({ where: { id: input.displayGroupId, ...getScopedRecordWhere(user) }, select: { id: true, organizationId: true, siteId: true } }); if (!group) throw new Error("Display group not found."); const campaign = await prisma.menuBoardPromotionCampaign.findFirst({ where: { id: input.campaignId, organizationId: group.organizationId, siteId: group.siteId, ...getScopedRecordWhere(user) }, select: { id: true } }); if (!campaign) throw new Error("The selected promotion is outside this store."); const updated = await prisma.menuBoardDisplayZone.updateMany({ where: { displayGroupId: group.id, organizationId: group.organizationId, role: "PROMOTION", contentType: "PROMOTION" }, data: { promotionCampaignId: campaign.id, activePromotionPublishId: null, menuId: null, activeMenuPublishId: null } }); if (updated.count !== 1) throw new Error("The promotion wall zone is unavailable."); }
