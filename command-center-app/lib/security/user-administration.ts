import { hash } from "bcryptjs";

import { prisma } from "@/lib/db";
import type { AppRole } from "@/lib/rbac";
import { emitAccountSecurityEvent } from "@/lib/security/account-security-audit";
import { setUserActiveState } from "@/lib/security/account-lifecycle";

export type UserAdministrationActor = {
  id: string;
  role: AppRole;
  organizationId: string | null;
};

const CLIENT_ASSIGNABLE_ROLES: readonly AppRole[] = ["CLIENT_ADMIN", "VIEWER"];
const userSelect = {
  id: true,
  email: true,
  role: true,
  organizationId: true,
  isActive: true,
  emailVerifiedAt: true,
  createdAt: true,
  updatedAt: true
} as const;

function requireClientOrganization(actor: UserAdministrationActor) {
  if (actor.role !== "CLIENT_ADMIN" || !actor.organizationId) {
    throw new Error("Client user administration requires an authenticated client organization.");
  }
  return actor.organizationId;
}

function requireClientAssignableRole(role: AppRole) {
  if (!CLIENT_ASSIGNABLE_ROLES.includes(role)) {
    throw new Error("Client administrators cannot assign platform roles.");
  }
}

async function requireTenantUser(actor: UserAdministrationActor, userId: string) {
  const organizationId = requireClientOrganization(actor);
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId },
    select: userSelect
  });
  if (!user) throw new Error("User not found.");
  return user;
}

export async function listTenantUsers(actor: UserAdministrationActor) {
  const organizationId = requireClientOrganization(actor);
  return prisma.user.findMany({
    where: { organizationId },
    orderBy: [{ isActive: "desc" }, { email: "asc" }],
    select: userSelect
  });
}

export async function createTenantUser(input: {
  actor: UserAdministrationActor;
  email: string;
  role: AppRole;
  temporaryPassword: string;
}) {
  const organizationId = requireClientOrganization(input.actor);
  requireClientAssignableRole(input.role);
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("Email is required.");
  if (input.temporaryPassword.length < 12) throw new Error("Temporary password must be at least 12 characters.");

  const passwordHash = await hash(input.temporaryPassword, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: input.role,
      organizationId,
      isActive: true,
      passwordChangedAt: new Date()
    },
    select: userSelect
  });
  emitAccountSecurityEvent({ event: "USER_CREATED", userId: user.id, actorUserId: input.actor.id });
  return user;
}

export async function changeTenantUserRole(input: {
  actor: UserAdministrationActor;
  userId: string;
  role: AppRole;
}) {
  requireClientAssignableRole(input.role);
  const target = await requireTenantUser(input.actor, input.userId);

  if (target.role === "CLIENT_ADMIN" && input.role !== "CLIENT_ADMIN" && target.isActive) {
    const activeAdmins = await prisma.user.count({
      where: { organizationId: target.organizationId!, role: "CLIENT_ADMIN", isActive: true }
    });
    if (activeAdmins <= 1) throw new Error("The last active client administrator cannot be demoted.");
  }

  const user = await prisma.user.update({
    where: { id: target.id },
    data: { role: input.role, authVersion: { increment: 1 } },
    select: userSelect
  });
  emitAccountSecurityEvent({ event: "USER_ROLE_CHANGED", userId: user.id, actorUserId: input.actor.id });
  return user;
}

export async function setTenantUserActiveState(input: {
  actor: UserAdministrationActor;
  userId: string;
  isActive: boolean;
}) {
  const target = await requireTenantUser(input.actor, input.userId);
  if (!input.isActive && target.role === "CLIENT_ADMIN" && target.isActive) {
    const activeAdmins = await prisma.user.count({
      where: { organizationId: target.organizationId!, role: "CLIENT_ADMIN", isActive: true }
    });
    if (activeAdmins <= 1) throw new Error("The last active client administrator cannot be disabled.");
  }
  return setUserActiveState(target.id, input.isActive, input.actor.id);
}
