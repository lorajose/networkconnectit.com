import { prisma } from "@/lib/db";
import { emitAccountSecurityEvent } from "@/lib/security/account-security-audit";

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

export async function setUserActiveState(userId: string, isActive: boolean, actorUserId?: string | null) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive, authVersion: { increment: 1 } },
    select: lifecycleSelect
  });
  emitAccountSecurityEvent({ event: isActive ? "ACCOUNT_REACTIVATED" : "ACCOUNT_DISABLED", userId, actorUserId });
  return user;
}

export async function replaceUserPasswordHash(userId: string, passwordHash: string, changedAt = new Date()) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, passwordChangedAt: changedAt, authVersion: { increment: 1 } },
    select: lifecycleSelect
  });
  emitAccountSecurityEvent({ event: "PASSWORD_RESET_COMPLETED", userId });
  return user;
}

export async function markUserEmailVerified(userId: string, verifiedAt = new Date()) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: verifiedAt },
    select: lifecycleSelect
  });
  emitAccountSecurityEvent({ event: "EMAIL_VERIFIED", userId });
  return user;
}

export async function invalidateUserSessions(userId: string, actorUserId?: string | null) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { authVersion: { increment: 1 } },
    select: lifecycleSelect
  });
  emitAccountSecurityEvent({ event: "SESSIONS_INVALIDATED", userId, actorUserId });
  return user;
}
