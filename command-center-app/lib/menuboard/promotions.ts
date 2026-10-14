import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  getScopedRecordWhere,
  resolveWritableOrganizationId,
  type TenantUser,
} from "@/lib/management/tenant-policy";
import {
  isMenuBoardPromotionPublishPayload,
  serializeMenuBoardPromotionPublishPayload,
  type MenuBoardPromotionPublishPayload,
} from "@/lib/menuboard/wall-types";

export type CreatePromotionCampaignInput = {
  organizationId?: string | null;
  siteId: string;
  name: string;
};

export async function listMenuBoardPromotionCampaigns(user: TenantUser) {
  return prisma.menuBoardPromotionCampaign.findMany({
    where: getScopedRecordWhere(user),
    orderBy: [{ site: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      organizationId: true,
      siteId: true,
      organization: { select: { id: true, name: true } },
      site: { select: { id: true, name: true } },
      slides: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, headline: true, durationSeconds: true } },
      publishes: { orderBy: { version: "desc" }, take: 1, select: { id: true, version: true, createdAt: true } },
    },
  });
}

export async function createMenuBoardPromotionCampaign(user: TenantUser, input: CreatePromotionCampaignInput) {
  const organizationId = resolveWritableOrganizationId(user, input.organizationId);
  if (!organizationId) throw new Error("A valid organization is required.");
  const site = await prisma.site.findFirst({ where: { id: input.siteId, organizationId, ...getScopedRecordWhere(user) }, select: { id: true } });
  if (!site) throw new Error("The selected site is outside your tenant scope.");
  const name = input.name.trim();
  if (!name) throw new Error("Promotion campaign name is required.");
  return prisma.menuBoardPromotionCampaign.create({ data: { organizationId, siteId: site.id, name } });
}

export async function createMenuBoardPromotionSlide(user: TenantUser, input: { campaignId: string; headline: string; body?: string | null; offerText?: string | null; mediaUrl?: string | null; durationSeconds?: number }) {
  const campaign = await prisma.menuBoardPromotionCampaign.findFirst({ where: { id: input.campaignId, ...getScopedRecordWhere(user) }, select: { id: true, organizationId: true } });
  if (!campaign) throw new Error("Promotion campaign not found.");
  const headline = input.headline.trim();
  if (!headline) throw new Error("Promotion headline is required.");
  const durationSeconds = input.durationSeconds ?? 10;
  if (!Number.isSafeInteger(durationSeconds) || durationSeconds < 3 || durationSeconds > 120) throw new Error("Promotion duration must be between 3 and 120 seconds.");
  const aggregate = await prisma.menuBoardPromotionSlide.aggregate({ where: { organizationId: campaign.organizationId, campaignId: campaign.id }, _max: { sortOrder: true } });
  return prisma.menuBoardPromotionSlide.create({ data: { organizationId: campaign.organizationId, campaignId: campaign.id, headline, body: input.body?.trim() || null, offerText: input.offerText?.trim() || null, mediaUrl: input.mediaUrl?.trim() || null, durationSeconds, sortOrder: (aggregate._max.sortOrder ?? -1) + 1 } });
}

async function loadPromotionDraft(user: TenantUser, campaignId: string) {
  return prisma.menuBoardPromotionCampaign.findFirst({
    where: { id: campaignId, ...getScopedRecordWhere(user) },
    select: { id: true, organizationId: true, siteId: true, name: true, slides: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, headline: true, body: true, offerText: true, mediaUrl: true, durationSeconds: true } } },
  });
}

export function buildPromotionPublishPayload(campaign: NonNullable<Awaited<ReturnType<typeof loadPromotionDraft>>>): MenuBoardPromotionPublishPayload {
  return { schemaVersion: 1, campaignId: campaign.id, campaignName: campaign.name, slides: campaign.slides };
}

function hashPromotionPayload(payload: MenuBoardPromotionPublishPayload) {
  return createHash("sha256").update(serializeMenuBoardPromotionPublishPayload(payload), "utf8").digest("hex");
}

export async function publishMenuBoardPromotionCampaign(user: TenantUser, campaignId: string) {
  if (!user.id) throw new Error("A signed-in user is required to publish.");
  const draft = await loadPromotionDraft(user, campaignId);
  if (!draft) throw new Error("Promotion campaign not found.");
  if (draft.slides.length === 0) throw new Error("Add at least one promotion slide before publishing.");
  const payload = buildPromotionPublishPayload(draft);
  if (!isMenuBoardPromotionPublishPayload(payload)) throw new Error("Promotion campaign contains invalid slide content.");
  const payloadHash = hashPromotionPayload(payload);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const latest = await tx.menuBoardPromotionPublish.findFirst({ where: { campaignId: draft.id, organizationId: draft.organizationId }, orderBy: { version: "desc" }, select: { version: true } });
        const publish = await tx.menuBoardPromotionPublish.create({ data: { organizationId: draft.organizationId, campaignId: draft.id, publishedByUserId: user.id!, version: (latest?.version ?? 0) + 1, payload: payload as unknown as Prisma.InputJsonValue, payloadHash } });
        await tx.menuBoardDisplayZone.updateMany({ where: { organizationId: draft.organizationId, promotionCampaignId: draft.id, contentType: "PROMOTION" }, data: { activePromotionPublishId: publish.id } });
        return publish;
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "P2002" || attempt === 2) throw error;
    }
  }
  throw new Error("Could not allocate a promotion publish version.");
}

export async function rollbackMenuBoardPromotionCampaign(user: TenantUser, campaignId: string, version: number) {
  const campaign = await prisma.menuBoardPromotionCampaign.findFirst({ where: { id: campaignId, ...getScopedRecordWhere(user) }, select: { id: true, organizationId: true } });
  if (!campaign) throw new Error("Promotion campaign not found.");
  const publish = await prisma.menuBoardPromotionPublish.findFirst({ where: { campaignId: campaign.id, organizationId: campaign.organizationId, version }, select: { id: true, version: true } });
  if (!publish) throw new Error("Published promotion version not found.");
  await prisma.menuBoardDisplayZone.updateMany({ where: { organizationId: campaign.organizationId, promotionCampaignId: campaign.id, contentType: "PROMOTION" }, data: { activePromotionPublishId: publish.id } });
  return publish;
}
