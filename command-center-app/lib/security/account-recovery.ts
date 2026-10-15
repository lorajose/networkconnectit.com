import { hash } from "bcryptjs";

import { prisma } from "@/lib/db";
import { issueAccountToken, verifyAccountToken } from "@/lib/security/account-token";
import { markUserEmailVerified, replaceUserPasswordHash } from "@/lib/security/account-lifecycle";

const PASSWORD_HASH_ROUNDS = 12;

export async function issuePasswordResetTokenForDelivery(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isActive: true, authVersion: true }
  });

  // Callers must always return the same generic response. A token is returned only
  // to the trusted delivery adapter, never to the browser response.
  if (!user?.isActive) return null;

  return issueAccountToken({
    purpose: "PASSWORD_RESET",
    userId: user.id,
    authVersion: user.authVersion
  });
}

export async function completePasswordReset(token: string, newPassword: string) {
  if (newPassword.length < 12 || newPassword.length > 128) {
    throw new Error("Password does not meet security requirements.");
  }

  const payload = verifyAccountToken(token, "PASSWORD_RESET");
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, isActive: true, authVersion: true }
  });

  if (!user?.isActive || user.authVersion !== payload.authVersion) {
    throw new Error("Invalid or expired account token.");
  }

  const passwordHash = await hash(newPassword, PASSWORD_HASH_ROUNDS);
  return replaceUserPasswordHash(user.id, passwordHash);
}

export async function issueEmailVerificationTokenForDelivery(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isActive: true, authVersion: true, emailVerifiedAt: true }
  });

  if (!user?.isActive || user.emailVerifiedAt) return null;

  return issueAccountToken({
    purpose: "EMAIL_VERIFY",
    userId: user.id,
    authVersion: user.authVersion,
    email: user.email
  });
}

export async function completeEmailVerification(token: string) {
  const payload = verifyAccountToken(token, "EMAIL_VERIFY");
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, isActive: true, authVersion: true, emailVerifiedAt: true }
  });

  if (
    !user?.isActive ||
    user.emailVerifiedAt ||
    user.authVersion !== payload.authVersion ||
    user.email.toLowerCase() !== payload.email
  ) {
    throw new Error("Invalid or expired account token.");
  }

  return markUserEmailVerified(user.id);
}
