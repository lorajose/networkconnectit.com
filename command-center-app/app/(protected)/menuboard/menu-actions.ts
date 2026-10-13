"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import type { ManagementFormState } from "@/lib/management/form-state";
import { requireInventoryWriteAccess } from "@/lib/management/tenant";
import {
  createMenu,
  createMenuItem,
  createMenuSection,
  duplicateMenuItem,
  moveMenuItem,
  setMenuItemAvailability,
  updateMenuItemPrice
} from "@/lib/menuboard/menus";
import { parsePriceToCents } from "@/lib/menuboard/money";

const menuSchema = z.object({
  organizationId: z.string().trim().min(1, "Select an organization."),
  siteId: z.string().trim().min(1, "Select a site."),
  name: z.string().trim().min(1, "Menu name is required.").max(191),
  currency: z.string().trim().length(3, "Use a three-letter currency code.")
});

const sectionSchema = z.object({
  name: z.string().trim().min(1, "Section name is required.").max(191)
});

const itemSchema = z.object({
  sectionId: z.string().trim().min(1, "Select a section."),
  name: z.string().trim().min(1, "Item name is required.").max(191),
  description: z.string().trim().max(2000).optional(),
  imageUrl: z.string().trim().url().or(z.literal("")).optional(),
  price: z.string().trim().min(1, "Price is required.")
});

function errorState(
  message: string,
  fieldErrors?: Record<string, string[] | undefined>
): ManagementFormState {
  return {
    status: "error",
    message,
    fieldErrors
  };
}

export async function createMenuAction(
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = menuSchema.safeParse({
    organizationId: formData.get("organizationId"),
    siteId: formData.get("siteId"),
    name: formData.get("name"),
    currency: formData.get("currency") || "USD"
  });

  if (!parsed.success) {
    return errorState(
      "Review the menu fields and try again.",
      parsed.error.flatten().fieldErrors
    );
  }

  try {
    await createMenu(user, parsed.data);
    revalidatePath("/menuboard");
    revalidatePath("/menuboard/menus");
    return {
      status: "idle",
      message: "Menu created."
    };
  } catch (error) {
    return errorState(
      error instanceof Error ? error.message : "Could not create the menu."
    );
  }
}

export async function createMenuSectionAction(
  menuId: string,
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = sectionSchema.safeParse({
    name: formData.get("name")
  });

  if (!parsed.success) {
    return errorState(
      "Review the section fields and try again.",
      parsed.error.flatten().fieldErrors
    );
  }

  try {
    await createMenuSection(user, menuId, parsed.data.name);
    revalidatePath(`/menuboard/menus/${menuId}`);
    return {
      status: "idle",
      message: "Section created."
    };
  } catch (error) {
    return errorState(
      error instanceof Error ? error.message : "Could not create the section."
    );
  }
}

export async function createMenuItemAction(
  menuId: string,
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const parsed = itemSchema.safeParse({
    sectionId: formData.get("sectionId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    imageUrl: formData.get("imageUrl") || "",
    price: formData.get("price")
  });

  if (!parsed.success) {
    return errorState(
      "Review the item fields and try again.",
      parsed.error.flatten().fieldErrors
    );
  }

  const priceCents = parsePriceToCents(parsed.data.price);

  if (priceCents === null) {
    return errorState("Enter a valid price with no more than two decimals.", {
      price: ["Use a value such as 5.99."]
    });
  }

  try {
    await createMenuItem(user, {
      menuId,
      sectionId: parsed.data.sectionId,
      name: parsed.data.name,
      description: parsed.data.description,
      imageUrl: parsed.data.imageUrl || null,
      priceCents
    });
    revalidatePath(`/menuboard/menus/${menuId}`);
    return {
      status: "idle",
      message: "Menu item created."
    };
  } catch (error) {
    return errorState(
      error instanceof Error ? error.message : "Could not create the menu item."
    );
  }
}

export async function updateMenuItemPriceAction(
  itemId: string,
  menuId: string,
  _prevState: ManagementFormState,
  formData: FormData
): Promise<ManagementFormState> {
  const user = requireInventoryWriteAccess(await requireUser());
  const rawPrice = String(formData.get("price") ?? "");
  const priceCents = parsePriceToCents(rawPrice);

  if (priceCents === null) {
    return errorState("Enter a valid price such as 5.99.", {
      price: ["Use no more than two decimals."]
    });
  }

  try {
    await updateMenuItemPrice(user, itemId, priceCents);
    revalidatePath(`/menuboard/menus/${menuId}`);
    return {
      status: "idle",
      message: "Price updated."
    };
  } catch (error) {
    return errorState(
      error instanceof Error ? error.message : "Could not update the price."
    );
  }
}

export async function setMenuItemAvailabilityAction(
  itemId: string,
  menuId: string,
  isAvailable: boolean
) {
  const user = requireInventoryWriteAccess(await requireUser());
  await setMenuItemAvailability(user, itemId, isAvailable);
  revalidatePath(`/menuboard/menus/${menuId}`);
}

export async function duplicateMenuItemAction(
  itemId: string,
  menuId: string
) {
  const user = requireInventoryWriteAccess(await requireUser());
  await duplicateMenuItem(user, itemId);
  revalidatePath(`/menuboard/menus/${menuId}`);
}

export async function moveMenuItemAction(
  itemId: string,
  menuId: string,
  direction: "UP" | "DOWN"
) {
  const user = requireInventoryWriteAccess(await requireUser());
  await moveMenuItem(user, itemId, direction);
  revalidatePath(`/menuboard/menus/${menuId}`);
}
