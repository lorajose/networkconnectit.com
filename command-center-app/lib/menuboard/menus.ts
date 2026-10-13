import { prisma } from "@/lib/db";
import {
  getScopedRecordWhere,
  resolveWritableOrganizationId,
  type TenantUser
} from "@/lib/management/tenant-policy";

export type CreateMenuInput = {
  organizationId?: string | null;
  siteId: string;
  name: string;
  currency?: string;
  templateKey?: string;
};

export type MenuPresentationInput = {
  displayName?: string | null;
  logoUrl?: string | null;
  promotionTitle?: string | null;
  promotionText?: string | null;
};

export async function listMenus(user: TenantUser) {
  return prisma.menu.findMany({
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
      _count: {
        select: {
          sections: true,
          items: true,
          assignments: true,
          publishes: true
        }
      }
    },
    orderBy: [{ site: { name: "asc" } }, { name: "asc" }]
  });
}

export async function getMenuById(user: TenantUser, menuId: string) {
  return prisma.menu.findFirst({
    where: {
      id: menuId,
      ...getScopedRecordWhere(user)
    },
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
      sections: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          items: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
          }
        }
      },
      assignments: {
        include: {
          screen: {
            select: {
              id: true,
              name: true,
              status: true
            }
          }
        }
      }
    }
  });
}

export async function createMenu(user: TenantUser, input: CreateMenuInput) {
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

  return prisma.menu.create({
    data: {
      organizationId,
      siteId: site.id,
      name: input.name.trim(),
      currency: (input.currency ?? "USD").trim().toUpperCase(),
      templateKey: input.templateKey ?? "DELI_LANDSCAPE_V1"
    }
  });
}

export async function updateMenuPresentation(
  user: TenantUser,
  menuId: string,
  input: MenuPresentationInput
) {
  const menu = await prisma.menu.findFirst({
    where: {
      id: menuId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true
    }
  });

  if (!menu) {
    throw new Error("Menu not found.");
  }

  return prisma.menu.update({
    where: {
      id: menu.id
    },
    data: {
      displayName: input.displayName?.trim() || null,
      logoUrl: input.logoUrl?.trim() || null,
      promotionTitle: input.promotionTitle?.trim() || null,
      promotionText: input.promotionText?.trim() || null
    }
  });
}

export async function getAssignableScreens(
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
      organizationId: true,
      siteId: true
    }
  });

  if (!menu) {
    throw new Error("Menu not found.");
  }

  return prisma.menuBoardScreen.findMany({
    where: {
      organizationId: menu.organizationId,
      siteId: menu.siteId,
      ...getScopedRecordWhere(user)
    },
    orderBy: {
      name: "asc"
    },
    select: {
      id: true,
      name: true,
      status: true,
      assignment: {
        select: {
          menuId: true
        }
      }
    }
  });
}

export async function assignMenuToScreens(
  user: TenantUser,
  menuId: string,
  screenIds: string[]
) {
  const menu = await prisma.menu.findFirst({
    where: {
      id: menuId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true,
      siteId: true
    }
  });

  if (!menu) {
    throw new Error("Menu not found.");
  }

  const uniqueScreenIds = [...new Set(screenIds)];
  const screens = uniqueScreenIds.length
    ? await prisma.menuBoardScreen.findMany({
        where: {
          id: {
            in: uniqueScreenIds
          },
          organizationId: menu.organizationId,
          siteId: menu.siteId,
          ...getScopedRecordWhere(user)
        },
        select: {
          id: true
        }
      })
    : [];

  if (screens.length !== uniqueScreenIds.length) {
    throw new Error("One or more selected screens are outside this store.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.menuScreenAssignment.deleteMany({
      where: {
        menuId: menu.id
      }
    });

    for (const screen of screens) {
      await tx.menuScreenAssignment.upsert({
        where: {
          screenId: screen.id
        },
        update: {
          organizationId: menu.organizationId,
          menuId: menu.id
        },
        create: {
          organizationId: menu.organizationId,
          screenId: screen.id,
          menuId: menu.id
        }
      });
    }
  });
}

export async function createMenuSection(
  user: TenantUser,
  menuId: string,
  name: string
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

  const aggregate = await prisma.menuSection.aggregate({
    where: {
      menuId: menu.id,
      organizationId: menu.organizationId
    },
    _max: {
      sortOrder: true
    }
  });

  return prisma.menuSection.create({
    data: {
      organizationId: menu.organizationId,
      menuId: menu.id,
      name: name.trim(),
      sortOrder: (aggregate._max.sortOrder ?? -1) + 1
    }
  });
}

export async function createMenuItem(
  user: TenantUser,
  input: {
    menuId: string;
    sectionId: string;
    name: string;
    description?: string | null;
    priceCents: number;
    imageUrl?: string | null;
  }
) {
  const menu = await prisma.menu.findFirst({
    where: {
      id: input.menuId,
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

  const section = await prisma.menuSection.findFirst({
    where: {
      id: input.sectionId,
      menuId: menu.id,
      organizationId: menu.organizationId
    },
    select: {
      id: true
    }
  });

  if (!section) {
    throw new Error("The selected section is outside this menu.");
  }

  const aggregate = await prisma.menuItem.aggregate({
    where: {
      sectionId: section.id,
      organizationId: menu.organizationId
    },
    _max: {
      sortOrder: true
    }
  });

  return prisma.menuItem.create({
    data: {
      organizationId: menu.organizationId,
      menuId: menu.id,
      sectionId: section.id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      priceCents: input.priceCents,
      imageUrl: input.imageUrl?.trim() || null,
      sortOrder: (aggregate._max.sortOrder ?? -1) + 1
    }
  });
}

export async function updateMenuItemPrice(
  user: TenantUser,
  itemId: string,
  priceCents: number
) {
  const item = await prisma.menuItem.findFirst({
    where: {
      id: itemId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true
    }
  });

  if (!item) {
    throw new Error("Menu item not found.");
  }

  return prisma.menuItem.update({
    where: {
      id: item.id
    },
    data: {
      priceCents
    }
  });
}

export async function setMenuItemAvailability(
  user: TenantUser,
  itemId: string,
  isAvailable: boolean
) {
  const item = await prisma.menuItem.findFirst({
    where: {
      id: itemId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true
    }
  });

  if (!item) {
    throw new Error("Menu item not found.");
  }

  return prisma.menuItem.update({
    where: {
      id: item.id
    },
    data: {
      isAvailable
    }
  });
}

export async function duplicateMenuItem(user: TenantUser, itemId: string) {
  const item = await prisma.menuItem.findFirst({
    where: {
      id: itemId,
      ...getScopedRecordWhere(user)
    }
  });

  if (!item) {
    throw new Error("Menu item not found.");
  }

  const aggregate = await prisma.menuItem.aggregate({
    where: {
      sectionId: item.sectionId,
      organizationId: item.organizationId
    },
    _max: {
      sortOrder: true
    }
  });

  return prisma.menuItem.create({
    data: {
      organizationId: item.organizationId,
      menuId: item.menuId,
      sectionId: item.sectionId,
      name: `${item.name} Copy`,
      description: item.description,
      priceCents: item.priceCents,
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      sortOrder: (aggregate._max.sortOrder ?? -1) + 1
    }
  });
}

export async function moveMenuItem(
  user: TenantUser,
  itemId: string,
  direction: "UP" | "DOWN"
) {
  const item = await prisma.menuItem.findFirst({
    where: {
      id: itemId,
      ...getScopedRecordWhere(user)
    }
  });

  if (!item) {
    throw new Error("Menu item not found.");
  }

  const neighbor = await prisma.menuItem.findFirst({
    where: {
      sectionId: item.sectionId,
      organizationId: item.organizationId,
      ...(direction === "UP"
        ? { sortOrder: { lt: item.sortOrder } }
        : { sortOrder: { gt: item.sortOrder } })
    },
    orderBy: {
      sortOrder: direction === "UP" ? "desc" : "asc"
    }
  });

  if (!neighbor) {
    return item;
  }

  await prisma.$transaction([
    prisma.menuItem.update({
      where: { id: item.id },
      data: { sortOrder: neighbor.sortOrder }
    }),
    prisma.menuItem.update({
      where: { id: neighbor.id },
      data: { sortOrder: item.sortOrder }
    })
  ]);

  return prisma.menuItem.findUnique({
    where: {
      id: item.id
    }
  });
}
