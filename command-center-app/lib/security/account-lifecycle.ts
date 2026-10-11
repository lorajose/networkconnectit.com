import { prisma } from "@/lib/db";

const lifecycleSelect = {
  id: true,
  email: true,
  role: true,
  organizationId: true,
  isActive: true,
  authVersion: true,
  emailVerifiedAt: true,
  passwordChangedAt: true,
  updatedAt: true
} as const;

export async function setUserActiveState(userId: string, isActive: boolean) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      isActive,
      authVersion: { increment: 1 }
    },
    select: lifecycleSelect
  });
}

export async function replaceUserPasswordHash(
  userId: string,
  passwordHash: string,
  changedAt = new Date()
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      passwordChangedAt: changedAt,
      authVersion: { increment: 1 }
    },
    select: lifecycleSelect
  });
}

export async function markUserEmailVerified(
  userId: string,
  verifiedAt = new Date()
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      emailVerifiedAt: verifiedAt
    },
    select: lifecycleSelect
  });
}

export async function invalidateUserSessions(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      authVersion: { increment: 1 }
    },
    select: lifecycleSelect
  });
}
