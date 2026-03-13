import {
  OrganizationStatus,
  Prisma,
  type Organization
} from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  getScopedOrganizationWhere,
  type TenantUser
} from "@/lib/management/tenant";

export const MANAGEMENT_PAGE_SIZE = 10;

export type OrganizationListFilters = {
  query: string;
  status: OrganizationStatus | "";
  page: number;
};

export type OrganizationOption = {
  id: string;
  name: string;
  slug: string;
};

export async function getOrganizationOptions(user: TenantUser) {
  return prisma.organization.findMany({
    where: getScopedOrganizationWhere(user),
    orderBy: {
      name: "asc"
    },
    select: {
      id: true,
      name: true,
      slug: true
    }
  });
}

function buildOrganizationWhere(
  user: TenantUser,
  filters: OrganizationListFilters
): Prisma.OrganizationWhereInput {
  const search = filters.query.trim();

  return {
    AND: [
      getScopedOrganizationWhere(user),
      filters.status
        ? {
            status: filters.status
          }
        : {},
      search
        ? {
            OR: [
              {
                name: {
                  contains: search
                }
              },
              {
                slug: {
                  contains: search
                }
              },
              {
                contactName: {
                  contains: search
                }
              },
              {
                contactEmail: {
                  contains: search
                }
              }
            ]
          }
        : {}
    ]
  };
}

export async function getOrganizationsList(
  user: TenantUser,
  filters: OrganizationListFilters
) {
  const where = buildOrganizationWhere(user, filters);
  const skip = (filters.page - 1) * MANAGEMENT_PAGE_SIZE;

  const [totalCount, organizations] = await prisma.$transaction([
    prisma.organization.count({ where }),
    prisma.organization.findMany({
      where,
      orderBy: {
        name: "asc"
      },
      skip,
      take: MANAGEMENT_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        slug: true,
        contactName: true,
        contactEmail: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sites: true,
            devices: true
          }
        }
      }
    })
  ]);

  return {
    organizations,
    totalCount,
    pageSize: MANAGEMENT_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(totalCount / MANAGEMENT_PAGE_SIZE))
  };
}

export async function getOrganizationDetail(user: TenantUser, id: string) {
  return prisma.organization.findFirst({
    where: {
      id,
      ...getScopedOrganizationWhere(user)
    },
    select: {
      id: true,
      name: true,
      slug: true,
      contactName: true,
      contactEmail: true,
      phone: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          sites: true,
          devices: true,
          users: true
        }
      },
      sites: {
        orderBy: {
          name: "asc"
        },
        take: 12,
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
          status: true,
          updatedAt: true,
          _count: {
            select: {
              devices: true
            }
          }
        }
      }
    }
  });
}

export async function getOrganizationForEdit(user: TenantUser, id: string) {
  return prisma.organization.findFirst({
    where: {
      id,
      ...getScopedOrganizationWhere(user)
    },
    select: {
      id: true,
      name: true,
      slug: true,
      contactName: true,
      contactEmail: true,
      phone: true,
      status: true
    }
  });
}

export async function getOrganizationName(user: TenantUser) {
  if (!user.organizationId) {
    return null;
  }

  const organization = await prisma.organization.findFirst({
    where: {
      id: user.organizationId,
      ...getScopedOrganizationWhere(user)
    },
    select: {
      name: true
    }
  });

  return organization?.name ?? null;
}

export function normalizeOrganizationInput(
  values: Pick<
    Organization,
    "name" | "slug" | "contactName" | "contactEmail" | "phone" | "status"
  >
) {
  return {
    name: values.name.trim(),
    slug: values.slug.trim().toLowerCase(),
    contactName: values.contactName?.trim() || null,
    contactEmail: values.contactEmail?.trim().toLowerCase() || null,
    phone: values.phone?.trim() || null,
    status: values.status
  };
}
