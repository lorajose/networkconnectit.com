"use server";

import { revalidatePath } from "next/cache";

import { requireRoles } from "@/lib/auth";
import type { AppRole } from "@/lib/rbac";
import { routeAccess } from "@/lib/rbac";
import {
  changeTenantUserRole,
  createTenantUser,
  setTenantUserActiveState,
  type UserAdministrationActor
} from "@/lib/security/user-administration";

function actorFromSession(user: Awaited<ReturnType<typeof requireRoles>>): UserAdministrationActor {
  return {
    id: user.id,
    role: user.role,
    organizationId: user.organizationId ?? null
  };
}

function clientRole(value: FormDataEntryValue | null): AppRole {
  if (value === "CLIENT_ADMIN" || value === "VIEWER") return value;
  throw new Error("Invalid client role.");
}

function requiredText(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) throw new Error(`${key} is required.`);
  return value.trim();
}

export async function createUserAction(formData: FormData) {
  const user = await requireRoles(routeAccess.users);
  await createTenantUser({
    actor: actorFromSession(user),
    email: requiredText(formData, "email"),
    role: clientRole(formData.get("role")),
    temporaryPassword: requiredText(formData, "temporaryPassword")
  });
  revalidatePath("/users");
}

export async function changeUserRoleAction(formData: FormData) {
  const user = await requireRoles(routeAccess.users);
  await changeTenantUserRole({
    actor: actorFromSession(user),
    userId: requiredText(formData, "userId"),
    role: clientRole(formData.get("role"))
  });
  revalidatePath("/users");
}

export async function setUserActiveStateAction(formData: FormData) {
  const user = await requireRoles(routeAccess.users);
  const state = formData.get("isActive");
  if (state !== "true" && state !== "false") throw new Error("Invalid active state.");
  await setTenantUserActiveState({
    actor: actorFromSession(user),
    userId: requiredText(formData, "userId"),
    isActive: state === "true"
  });
  revalidatePath("/users");
}
