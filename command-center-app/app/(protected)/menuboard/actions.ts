"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import type { ManagementFormState } from "@/lib/management/form-state";
import { requireInventoryWriteAccess } from "@/lib/management/tenant";
import {
  createMenuBoardScreen,
  issueMenuBoardPairingCode,
  revokeMenuBoardPlayer
} from "@/lib/menuboard/screens";
import {
  createMenuBoardDisplayGroup,
  issueMenuBoardWallPairingCode,
  revokeMenuBoardWallPlayer
} from "@/lib/menuboard/wall";

const screenSchema = z.object({
  organizationId: z.string().trim().optional(),
  siteId: z.string().trim().min(1, "Select a site."),
  name: z.string().trim().min(1, "Screen name is required.").max(191),
  orientation: z.enum(["LANDSCAPE", "PORTRAIT"]),
  widthPx: z.coerce.number().int().min(320).max(7680),
  heightPx: z.coerce.number().int().min(320).max(7680)
});

const wallSchema = z.object({
  organizationId: z.string().trim().optional(),
  siteId: z.string().trim().min(1, "Select a site."),
  name: z.string().trim().min(1, "Wall name is required.").max(191)
});

export type PairingActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  code?: string;
  expiresAt?: string;
};

export async function createMenuBoardScreenAction(
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = screenSchema.safeParse({
    organizationId: formData.get("organizationId") || undefined,
    siteId: formData.get("siteId"),
    name: formData.get("name"),
    orientation: formData.get("orientation"),
    widthPx: formData.get("widthPx"),
    heightPx: formData.get("heightPx")
  });
  if (!parsed.success) return { status: "error", message: "Review the screen fields and try again.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await createMenuBoardScreen(user, parsed.data);
    revalidatePath("/menuboard");
    return { status: "idle", message: "Screen created." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Could not create the screen." };
  }
}

export async function createMenuBoardWallAction(
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = wallSchema.safeParse({
    organizationId: formData.get("organizationId") || undefined,
    siteId: formData.get("siteId"),
    name: formData.get("name")
  });
  if (!parsed.success) return { status: "error", message: "Review the wall fields and try again.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await createMenuBoardDisplayGroup(user, parsed.data);
    revalidatePath("/menuboard");
    return { status: "idle", message: "3-TV wall created." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Could not create the wall." };
  }
}

export async function generateMenuBoardPairingCodeAction(screenId: string, _prevState: PairingActionState, _formData: FormData): Promise<PairingActionState> {
  const user = requireInventoryWriteAccess(await requireUser());
  try {
    const pairing = await issueMenuBoardPairingCode(user, screenId);
    revalidatePath("/menuboard");
    return { status: "success", message: "Enter this code on the player. It is single-use and expires in 10 minutes.", code: pairing.code, expiresAt: pairing.expiresAt.toISOString() };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Could not generate a pairing code." };
  }
}

export async function generateMenuBoardWallPairingCodeAction(displayGroupId: string, _prevState: PairingActionState, _formData: FormData): Promise<PairingActionState> {
  const user = requireInventoryWriteAccess(await requireUser());
  try {
    const pairing = await issueMenuBoardWallPairingCode(user, displayGroupId);
    revalidatePath("/menuboard");
    return { status: "success", message: "Enter this code at /menuboard/wall. It is single-use and expires in 10 minutes.", code: pairing.code, expiresAt: pairing.expiresAt.toISOString() };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Could not generate a wall pairing code." };
  }
}

export async function revokeMenuBoardPlayerAction(screenId: string, _prevState: PairingActionState, _formData: FormData): Promise<PairingActionState> {
  const user = requireInventoryWriteAccess(await requireUser());
  try {
    await revokeMenuBoardPlayer(user, screenId);
    revalidatePath("/menuboard");
    return { status: "success", message: "Player credential revoked. Generate a new pairing code to reconnect." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Could not revoke the player." };
  }
}

export async function revokeMenuBoardWallPlayerAction(displayGroupId: string, _prevState: PairingActionState, _formData: FormData): Promise<PairingActionState> {
  const user = requireInventoryWriteAccess(await requireUser());
  try {
    await revokeMenuBoardWallPlayer(user, displayGroupId);
    revalidatePath("/menuboard");
    return { status: "success", message: "Wall player credential revoked. Generate a new pairing code to reconnect." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Could not revoke the wall player." };
  }
}
