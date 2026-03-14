import { Prisma, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { timingSafeEqual } from "crypto";

import { prisma } from "@/lib/db";
import {
  isEnabledEnvironmentFlag,
  looksLikePlaceholderValue
} from "@/lib/runtime-config";

const FIRST_ADMIN_BOOTSTRAP_LOCK_NAME =
  "networkconnectit:first-admin-bootstrap";
const FIRST_ADMIN_BOOTSTRAP_TOKEN_MIN_LENGTH = 24;
const FIRST_ADMIN_PASSWORD_HASH_ROUNDS = 12;
const INTERNAL_ADMIN_ROLES = [Role.SUPER_ADMIN, Role.INTERNAL_ADMIN];

export type FirstAdminBootstrapUnavailableReason =
  | "disabled"
  | "missing_token"
  | "weak_token"
  | "already_bootstrapped";

export type FirstAdminBootstrapAvailability = {
  enabledByEnvironment: boolean;
  tokenConfigured: boolean;
  tokenStrongEnough: boolean;
  internalAdminCount: number;
  available: boolean;
  unavailableReason: FirstAdminBootstrapUnavailableReason | null;
};

function getBootstrapToken() {
  return process.env.FIRST_ADMIN_BOOTSTRAP_TOKEN?.trim() ?? "";
}

function isBootstrapTokenStrongEnough(token: string) {
  return (
    token.length >= FIRST_ADMIN_BOOTSTRAP_TOKEN_MIN_LENGTH &&
    !looksLikePlaceholderValue(token)
  );
}

function secureCompareSecret(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

async function withFirstAdminBootstrapLock<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
) {
  return prisma.$transaction(async (tx) => {
    const lockRows = await tx.$queryRaw<Array<{ acquired: number | bigint | null }>>(
      Prisma.sql`SELECT GET_LOCK(${FIRST_ADMIN_BOOTSTRAP_LOCK_NAME}, 5) AS acquired`
    );
    const acquiredValue = lockRows[0]?.acquired;
    const acquired =
      typeof acquiredValue === "bigint"
        ? Number(acquiredValue)
        : acquiredValue ?? 0;

    if (acquired !== 1) {
      throw new Error(
        "First-admin bootstrap is busy. Wait a moment and try again."
      );
    }

    try {
      return await callback(tx);
    } finally {
      await tx.$queryRaw(
        Prisma.sql`SELECT RELEASE_LOCK(${FIRST_ADMIN_BOOTSTRAP_LOCK_NAME})`
      );
    }
  });
}

export function isFirstAdminBootstrapEnabled() {
  return isEnabledEnvironmentFlag(process.env.ENABLE_FIRST_ADMIN_BOOTSTRAP);
}

export async function getFirstAdminBootstrapAvailability(): Promise<FirstAdminBootstrapAvailability> {
  const enabledByEnvironment = isFirstAdminBootstrapEnabled();
  const bootstrapToken = getBootstrapToken();
  const internalAdminCount = await prisma.user.count({
    where: {
      role: {
        in: INTERNAL_ADMIN_ROLES
      }
    }
  });

  let unavailableReason: FirstAdminBootstrapUnavailableReason | null = null;

  if (!enabledByEnvironment) {
    unavailableReason = "disabled";
  } else if (!bootstrapToken) {
    unavailableReason = "missing_token";
  } else if (!isBootstrapTokenStrongEnough(bootstrapToken)) {
    unavailableReason = "weak_token";
  } else if (internalAdminCount > 0) {
    unavailableReason = "already_bootstrapped";
  }

  return {
    enabledByEnvironment,
    tokenConfigured: Boolean(bootstrapToken),
    tokenStrongEnough: isBootstrapTokenStrongEnough(bootstrapToken),
    internalAdminCount,
    available: unavailableReason === null,
    unavailableReason
  };
}

export async function createFirstInternalAdminUser(input: {
  name: string;
  email: string;
  password: string;
  bootstrapToken: string;
}) {
  const expectedBootstrapToken = getBootstrapToken();

  if (!isFirstAdminBootstrapEnabled()) {
    throw new Error(
      "First-admin bootstrap is not enabled in this environment."
    );
  }

  if (!expectedBootstrapToken) {
    throw new Error("First-admin bootstrap is missing its token.");
  }

  if (!isBootstrapTokenStrongEnough(expectedBootstrapToken)) {
    throw new Error("First-admin bootstrap token is too weak to use safely.");
  }

  if (
    !secureCompareSecret(expectedBootstrapToken, input.bootstrapToken.trim())
  ) {
    throw new Error("The bootstrap token is invalid.");
  }

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const passwordHash = await hash(
    input.password,
    FIRST_ADMIN_PASSWORD_HASH_ROUNDS
  );

  return withFirstAdminBootstrapLock(async (tx) => {
    const internalAdminCount = await tx.user.count({
      where: {
        role: {
          in: INTERNAL_ADMIN_ROLES
        }
      }
    });

    if (internalAdminCount > 0) {
      throw new Error(
        "An internal admin already exists. First-admin bootstrap is permanently locked for this database."
      );
    }

    const existingUser = await tx.user.findUnique({
      where: {
        email
      }
    });

    if (existingUser) {
      throw new Error("A user with that email already exists.");
    }

    return tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.SUPER_ADMIN
      }
    });
  });
}
