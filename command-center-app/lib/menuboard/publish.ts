import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  getScopedRecordWhere,
  type TenantUser
} from "@/lib/management/tenant-policy";
import { authenticateMenuBoardPlayer } from "@/lib/menuboard/screens";
import {
  isMenuBoardPublishPayload,
  type MenuBoardPublishPayload
} from "@/lib/menuboard/player-types";

function hashPayload(payload: MenuBoardPublishPayload) {
  return createHash("sha256")
    .update(JSON.stringify(payload), "utf8")
    .digest("hex");
}

async function loadDraftForPublish(user: TenantUser, menuId: string) {
  return prisma.menu.findFirst({
    where: {
      id: menuId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true,
      siteId: true,
      name: true,
      displayName: true,
      logoUrl: true,
      promotionTitle: true,
      promotionText: true,
      currency: true,
      templateKey: true,
      sections: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          items: {
            where: {
              isAvailable: true
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              name: true,
              description: true,
              priceCents: true,
              imageUrl: true
            }
          }
        }
      }
    }
  });
}

export function buildMenuBoardPublishPayload(
  menu: NonNullable<Awaited<ReturnType<typeof loadDraftForPublish>>>
): MenuBoardPublishPayload {
  return {
    schemaVersion: 1,
    templateKey: menu.templateKey,
    menuId: menu.id,
    menuName: menu.name,
    storeDisplayName: menu.displayName,
    logoUrl: menu.logoUrl,
    promotionTitle: menu.promotionTitle,
    promotionText: menu.promotionText,
    currency: menu.currency,
    sections: menu.sections
      .map((section) => ({
        id: section.id,
        name: section.name,
        items: section.items
      }))
      .filter((section) => section.items.length > 0)
  };
}

export async function publishMenuBoardMenu(
  user: TenantUser,
  menuId: string
) {
  if (!user.id) {
    throw new Error("A signed-in user is required to publish.");
  }

  const draft = await loadDraftForPublish(user, menuId);

  if (!draft) {
    throw new Error("Menu not found.");
  }

  const payload = buildMenuBoardPublishPayload(draft);
  const payloadHash = hashPayload(payload);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const latest = await tx.menuPublish.findFirst({
          where: {
            menuId: draft.id,
            organizationId: draft.organizationId
          },
          orderBy: {
            version: "desc"
          },
          select: {
            version: true
          }
        });

        const publish = await tx.menuPublish.create({
          data: {
            organizationId: draft.organizationId,
            menuId: draft.id,
            publishedByUserId: user.id!,
            version: (latest?.version ?? 0) + 1,
            payload: payload as unknown as Prisma.InputJsonValue,
            payloadHash
          }
        });

        await tx.menuScreenAssignment.updateMany({
          where: {
            organizationId: draft.organizationId,
            menuId: draft.id
          },
          data: {
            activePublishId: publish.id
          }
        });

        return publish;
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "P2002" || attempt === 2) {
        throw error;
      }
    }
  }

  throw new Error("Could not allocate a publish version.");
}

export async function listMenuBoardPublishes(
  user: TenantUser,
  menuId: string
) {
  const menu = await prisma.menu.findFirst({
    where: {
      id: menuId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true
    }
  });

  if (!menu) {
    throw new Error("Menu not found.");
  }

  return prisma.menuPublish.findMany({
    where: {
      menuId: menu.id,
      organizationId: menu.organizationId
    },
    orderBy: {
      version: "desc"
    },
    take: 20,
    select: {
      id: true,
      version: true,
      payloadHash: true,
      publishedAt: true,
      publishedBy: {
        select: {
          name: true,
          email: true
        }
      },
      _count: {
        select: {
          activeAssignments: true
        }
      }
    }
  });
}

export async function rollbackMenuBoardMenu(
  user: TenantUser,
  menuId: string,
  version: number
) {
  const menu = await prisma.menu.findFirst({
    where: {
      id: menuId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true
    }
  });

  if (!menu) {
    throw new Error("Menu not found.");
  }

  const publish = await prisma.menuPublish.findFirst({
    where: {
      menuId: menu.id,
      organizationId: menu.organizationId,
      version
    },
    select: {
      id: true,
      version: true
    }
  });

  if (!publish) {
    throw new Error("Published version not found.");
  }

  await prisma.menuScreenAssignment.updateMany({
    where: {
      organizationId: menu.organizationId,
      menuId: menu.id
    },
    data: {
      activePublishId: publish.id
    }
  });

  return publish;
}

export async function getMenuBoardPlayerContent(rawToken: string) {
  const screen = await authenticateMenuBoardPlayer(rawToken);

  if (!screen) {
    return null;
  }

  const assignment = await prisma.menuScreenAssignment.findUnique({
    where: {
      screenId: screen.id
    },
    select: {
      menuId: true,
      activePublish: {
        select: {
          id: true,
          version: true,
          payload: true,
          payloadHash: true,
          publishedAt: true
        }
      }
    }
  });

  const activePublish = assignment?.activePublish ?? null;

  if (
    activePublish &&
    !isMenuBoardPublishPayload(activePublish.payload)
  ) {
    return {
      screen: {
        id: screen.id,
        name: screen.name,
        orientation: screen.orientation,
        widthPx: screen.widthPx,
        heightPx: screen.heightPx,
        status: screen.status
      },
      assignment: null,
      malformedPublish: true
    };
  }

  return {
    screen: {
      id: screen.id,
      name: screen.name,
      orientation: screen.orientation,
      widthPx: screen.widthPx,
      heightPx: screen.heightPx,
      status: screen.status
    },
    assignment: assignment
      ? {
          menuId: assignment.menuId,
          activePublish: activePublish
            ? {
                ...activePublish,
                payload: activePublish.payload
              }
            : null
        }
      : null,
    malformedPublish: false
  };
}

export async function recordMenuBoardHeartbeat(
  rawToken: string,
  input: {
    playerVersion?: string | null;
    publishVersion?: number | null;
  }
) {
  const screen = await authenticateMenuBoardPlayer(rawToken);

  if (!screen) {
    return null;
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.menuBoardScreen.update({
      where: {
        id: screen.id
      },
      data: {
        status: "ONLINE",
        lastSeenAt: now,
        displayedPublishVersion: input.publishVersion ?? null
      }
    }),
    prisma.menuPlayerHeartbeat.create({
      data: {
        organizationId: screen.organizationId,
        screenId: screen.id,
        playerVersion: input.playerVersion?.trim() || null,
        publishVersion: input.publishVersion ?? null,
        receivedAt: now
      }
    })
  ]);

  return {
    screenId: screen.id,
    receivedAt: now
  };
}
