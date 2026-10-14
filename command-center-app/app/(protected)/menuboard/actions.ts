"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import type { ManagementFormState } from "@/lib/management/form-state";
import { requireInventoryWriteAccess } from "@/lib/management/tenant";
import { createMenuBoardScreen, issueMenuBoardPairingCode, revokeMenuBoardPlayer } from "@/lib/menuboard/screens";
import {
  assignMenuToWallZone,
  assignPromotionCampaignToWallZone,
  createMenuBoardDisplayGroup,
  issueMenuBoardWallPairingCode,
  revokeMenuBoardWallPlayer,
} from "@/lib/menuboard/wall";
import {
  createMenuBoardPromotionCampaign,
  createMenuBoardPromotionSlide,
  publishMenuBoardPromotionCampaign,
} from "@/lib/menuboard/promotions";

const screenSchema = z.object({ organizationId: z.string().trim().optional(), siteId: z.string().trim().min(1, "Select a site."), name: z.string().trim().min(1, "Screen name is required.").max(191), orientation: z.enum(["LANDSCAPE", "PORTRAIT"]), widthPx: z.coerce.number().int().min(320).max(7680), heightPx: z.coerce.number().int().min(320).max(7680) });
const wallSchema = z.object({ organizationId: z.string().trim().optional(), siteId: z.string().trim().min(1, "Select a site."), name: z.string().trim().min(1, "Wall name is required.").max(191) });
const menuZoneSchema = z.object({ displayGroupId: z.string().min(1), role: z.enum(["MENU_PRIMARY", "MENU_SECONDARY"]), menuId: z.string().min(1, "Select a menu.") });
const promotionCampaignSchema = z.object({ organizationId: z.string().optional(), siteId: z.string().min(1), displayGroupId: z.string().min(1), name: z.string().trim().min(1).max(191) });
const promotionSlideSchema = z.object({ campaignId: z.string().min(1), headline: z.string().trim().min(1).max(191), body: z.string().trim().max(512).optional(), offerText: z.string().trim().max(191).optional(), mediaUrl: z.string().trim().url().or(z.literal("")).optional(), durationSeconds: z.coerce.number().int().min(3).max(120) });

export type PairingActionState = { status: "idle" | "error" | "success"; message?: string; code?: string; expiresAt?: string };

export async function createMenuBoardScreenAction(_prevState: ManagementFormState, formData: FormData): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = screenSchema.safeParse({ organizationId: formData.get("organizationId") || undefined, siteId: formData.get("siteId"), name: formData.get("name"), orientation: formData.get("orientation"), widthPx: formData.get("widthPx"), heightPx: formData.get("heightPx") });
  if (!parsed.success) return { status: "error", message: "Review the screen fields and try again.", fieldErrors: parsed.error.flatten().fieldErrors };
  try { await createMenuBoardScreen(user, parsed.data); revalidatePath("/menuboard"); return { status: "idle", message: "Screen created." }; } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Could not create the screen." }; }
}

export async function createMenuBoardWallAction(_prevState: ManagementFormState, formData: FormData): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = wallSchema.safeParse({ organizationId: formData.get("organizationId") || undefined, siteId: formData.get("siteId"), name: formData.get("name") });
  if (!parsed.success) return { status: "error", message: "Review the wall fields and try again.", fieldErrors: parsed.error.flatten().fieldErrors };
  try { await createMenuBoardDisplayGroup(user, parsed.data); revalidatePath("/menuboard"); return { status: "idle", message: "3-TV wall created." }; } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Could not create the wall." }; }
}

export async function assignMenuBoardWallMenuAction(_prevState: ManagementFormState, formData: FormData): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = menuZoneSchema.safeParse({ displayGroupId: formData.get("displayGroupId"), role: formData.get("role"), menuId: formData.get("menuId") });
  if (!parsed.success) return { status: "error", message: "Select a valid menu for this TV." };
  try { await assignMenuToWallZone(user, parsed.data); revalidatePath("/menuboard"); return { status: "idle", message: `${parsed.data.role === "MENU_PRIMARY" ? "TV1" : "TV2"} menu assigned. Publish the menu to send its newest version.` }; } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Could not assign the menu." }; }
}

export async function createAndAssignMenuBoardPromotionAction(_prevState: ManagementFormState, formData: FormData): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = promotionCampaignSchema.safeParse({ organizationId: formData.get("organizationId") || undefined, siteId: formData.get("siteId"), displayGroupId: formData.get("displayGroupId"), name: formData.get("name") });
  if (!parsed.success) return { status: "error", message: "Enter a promotion campaign name." };
  try { const campaign = await createMenuBoardPromotionCampaign(user, parsed.data); await assignPromotionCampaignToWallZone(user, { displayGroupId: parsed.data.displayGroupId, campaignId: campaign.id }); revalidatePath("/menuboard"); return { status: "idle", message: "Promotion campaign created and assigned to TV3." }; } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Could not create the promotion campaign." }; }
}

export async function assignMenuBoardPromotionAction(_prevState: ManagementFormState, formData: FormData): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const displayGroupId = String(formData.get("displayGroupId") ?? ""); const campaignId = String(formData.get("campaignId") ?? "");
  if (!displayGroupId || !campaignId) return { status: "error", message: "Select a promotion campaign." };
  try { await assignPromotionCampaignToWallZone(user, { displayGroupId, campaignId }); revalidatePath("/menuboard"); return { status: "idle", message: "Promotion campaign assigned to TV3. Publish it when ready." }; } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Could not assign the promotion campaign." }; }
}

export async function addMenuBoardPromotionSlideAction(_prevState: ManagementFormState, formData: FormData): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = promotionSlideSchema.safeParse({ campaignId: formData.get("campaignId"), headline: formData.get("headline"), body: formData.get("body") || undefined, offerText: formData.get("offerText") || undefined, mediaUrl: formData.get("mediaUrl") || "", durationSeconds: formData.get("durationSeconds") || 10 });
  if (!parsed.success) return { status: "error", message: "Review the promotion slide fields." };
  try { await createMenuBoardPromotionSlide(user, parsed.data); revalidatePath("/menuboard"); return { status: "idle", message: "Promotion slide added." }; } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Could not add the promotion slide." }; }
}

export async function publishMenuBoardPromotionAction(_prevState: ManagementFormState, formData: FormData): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser()); const campaignId = String(formData.get("campaignId") ?? "");
  if (!campaignId) return { status: "error", message: "Promotion campaign is required." };
  try { const publish = await publishMenuBoardPromotionCampaign(user, campaignId); revalidatePath("/menuboard"); return { status: "idle", message: `TV3 promotion published as version ${publish.version}.` }; } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Could not publish the promotion." }; }
}

export async function generateMenuBoardPairingCodeAction(screenId: string, _prevState: PairingActionState, _formData: FormData): Promise<PairingActionState> { const user = requireInventoryWriteAccess(await requireUser()); try { const pairing = await issueMenuBoardPairingCode(user, screenId); revalidatePath("/menuboard"); return { status: "success", message: "Enter this code on the player. It is single-use and expires in 10 minutes.", code: pairing.code, expiresAt: pairing.expiresAt.toISOString() }; } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Could not generate a pairing code." }; } }
export async function generateMenuBoardWallPairingCodeAction(displayGroupId: string, _prevState: PairingActionState, _formData: FormData): Promise<PairingActionState> { const user = requireInventoryWriteAccess(await requireUser()); try { const pairing = await issueMenuBoardWallPairingCode(user, displayGroupId); revalidatePath("/menuboard"); return { status: "success", message: "Enter this code at /menuboard/wall. It is single-use and expires in 10 minutes.", code: pairing.code, expiresAt: pairing.expiresAt.toISOString() }; } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Could not generate a wall pairing code." }; } }
export async function revokeMenuBoardPlayerAction(screenId: string, _prevState: PairingActionState, _formData: FormData): Promise<PairingActionState> { const user = requireInventoryWriteAccess(await requireUser()); try { await revokeMenuBoardPlayer(user, screenId); revalidatePath("/menuboard"); return { status: "success", message: "Player credential revoked. Generate a new pairing code to reconnect." }; } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Could not revoke the player." }; } }
export async function revokeMenuBoardWallPlayerAction(displayGroupId: string, _prevState: PairingActionState, _formData: FormData): Promise<PairingActionState> { const user = requireInventoryWriteAccess(await requireUser()); try { await revokeMenuBoardWallPlayer(user, displayGroupId); revalidatePath("/menuboard"); return { status: "success", message: "Wall player credential revoked. Generate a new pairing code to reconnect." }; } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Could not revoke the wall player." }; } }
