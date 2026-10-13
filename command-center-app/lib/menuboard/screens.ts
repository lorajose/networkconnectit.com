import type { MenuBoardScreenOrientation } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  getScopedRecordWhere,
  resolveWritableOrganizationId,
  type TenantUser
} from "@/lib/management/tenant-policy";
import {
  generatePairingCode,
  generatePlayerToken,
  getPairingCodeExpiry,
  hashMenuBoardSecret,
  isPairingCodeExpired,
  normalizePairingCode
} from "@/lib/menuboard/security";

export type CreateMenuBoardScreenInput = {
  organizationId?: string | null;
  siteId: string;
  name: string;
  orientation?: MenuBoardScreenOrientation;
  widthPx?: number;
  heightPx?: number;
};

export async function getMenuBoardScreenOptions(user: TenantUser) {
  const organizations = await prisma.organization.findMany({
    where: getScopedRecordWhere(user),
    select: {
      id: true,
      name: true,
      sites: {
        where: getScopedRecordWhere(user),
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { name: "asc" }
  });

  return organizations;
}

export async function listMenuBoardScreens(user: TenantUser) {
  return prisma.menuBoardScreen.findMany({
    where: getScopedRecordWhere(user),
    include: {
      organization: {
        select: {
          id: true,
          name: true
        }
      },
      site: {
        select: {
          id: true,
          name: true
        }
      },
      assignment: {
        include: {
          menu: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: [{ site: { name: "asc" } }, { name: "asc" }]
  });
}

export async function createMenuBoardScreen(
  user: TenantUser,
  input: CreateMenuBoardScreenInput
) {
  const organizationId = resolveWritableOrganizationId(
    user,
    input.organizationId
  );

  if (!organizationId) {
    throw new Error("A valid organization is required.");
  }

  const site = await prisma.site.findFirst({
    where: {
      id: input.siteId,
      organizationId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true
    }
  });

  if (!site) {
    throw new Error("The selected site is outside your tenant scope.");
  }

  return prisma.menuBoardScreen.create({
    data: {
      organizationId,
      siteId: site.id,
      name: input.name.trim(),
      orientation: input.orientation ?? "LANDSCAPE",
      widthPx: input.widthPx ?? 1920,
      heightPx: input.heightPx ?? 1080
    }
  });
}

export async function issueMenuBoardPairingCode(
  user: TenantUser,
  screenId: string
) {
  const screen = await prisma.menuBoardScreen.findFirst({
    where: {
      id: screenId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true
    }
  });

  if (!screen) {
    throw new Error("Screen not found.");
  }

  const now = new Date();
  await prisma.menuPairingCode.deleteMany({
    where: {
      screenId: screen.id,
      consumedAt: null
    }
  });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generatePairingCode();
    const codeHash = hashMenuBoardSecret(code);

    try {
      const pairing = await prisma.menuPairingCode.create({
        data: {
          organizationId: screen.organizationId,
          screenId: screen.id,
          codeHash,
          expiresAt: getPairingCodeExpiry(now)
        },
        select: {
          expiresAt: true
        }
      });

      return {
        code,
        expiresAt: pairing.expiresAt
      };
    } catch (error) {
      const maybeCode = error as { code?: string };
      if (maybeCode.code !== "P2002") {
        throw error;
      }
    }
  }

  throw new Error("Could not allocate a pairing code. Try again.");
}

export async function consumeMenuBoardPairingCode(rawCode: string) {
  const code = normalizePairingCode(rawCode);

  if (!/^\d{6}$/.test(code)) {
    return null;
  }

  const codeHash = hashMenuBoardSecret(code);
  const now = new Date();
  const candidate = await prisma.menuPairingCode.findUnique({
    where: {
      codeHash
    },
    select: {
      id: true,
      organizationId: true,
      screenId: true,
      expiresAt: true,
      consumedAt: true
    }
  });

  if (
    !candidate ||
    candidate.consumedAt ||
    isPairingCodeExpired(candidate.expiresAt, now)
  ) {
    return null;
  }

  const playerToken = generatePlayerToken();
  const playerTokenHash = hashMenuBoardSecret(playerToken);

  const paired = await prisma.$transaction(async (tx) => {
    const claimed = await tx.menuPairingCode.updateMany({
      where: {
        id: candidate.id,
        consumedAt: null,
        expiresAt: {
          gt: now
        }
      },
      data: {
        consumedAt: now
      }
    });

    if (claimed.count !== 1) {
      return null;
    }

    const screen = await tx.menuBoardScreen.update({
      where: {
        id: candidate.screenId
      },
      data: {
        playerTokenHash,
        playerTokenIssuedAt: now,
        playerTokenRevokedAt: null,
        status: "OFFLINE"
      },
      select: {
        id: true,
        name: true,
        orientation: true,
        widthPx: true,
        heightPx: true
      }
    });

    await tx.menuPairingCode.deleteMany({
      where: {
        screenId: candidate.screenId,
        consumedAt: null
      }
    });

    return screen;
  });

  if (!paired) {
    return null;
  }

  return {
    playerToken,
    screen: paired
  };
}

export async function revokeMenuBoardPlayer(
  user: TenantUser,
  screenId: string
) {
  const screen = await prisma.menuBoardScreen.findFirst({
    where: {
      id: screenId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true
    }
  });

  if (!screen) {
    throw new Error("Screen not found.");
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.menuPairingCode.deleteMany({
      where: {
        screenId: screen.id,
        consumedAt: null
      }
    }),
    prisma.menuBoardScreen.update({
      where: {
        id: screen.id
      },
      data: {
        playerTokenHash: null,
        playerTokenIssuedAt: null,
        playerTokenRevokedAt: now,
        status: "REVOKED"
      }
    })
  ]);
}

export async function authenticateMenuBoardPlayer(rawToken: string) {
  if (!rawToken) {
    return null;
  }

  const tokenHash = hashMenuBoardSecret(rawToken);
  return prisma.menuBoardScreen.findFirst({
    where: {
      playerTokenHash: tokenHash,
      playerTokenRevokedAt: null
    },
    select: {
      id: true,
      organizationId: true,
      siteId: true,
      name: true,
      orientation: true,
      widthPx: true,
      heightPx: true,
      status: true
    }
  });
}
