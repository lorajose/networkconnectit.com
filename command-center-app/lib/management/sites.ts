import { SiteStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { MANAGEMENT_PAGE_SIZE, getOrganizationOptions } from "@/lib/management/organizations";
import {
  getScopedRecordWhere,
  type TenantUser
} from "@/lib/management/tenant";

export type SitesListFilters = {
  query: string;
  organizationId: string;
  country: string;
  status: SiteStatus | "";
  page: number;
};

export type SiteOption = {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
};

function buildSitesWhere(
  user: TenantUser,
  filters: SitesListFilters
): Prisma.SiteWhereInput {
  const search = filters.query.trim();

  return {
    AND: [
      getScopedRecordWhere(user),
      filters.organizationId
        ? {
            organizationId: filters.organizationId
          }
        : {},
      filters.country
        ? {
            country: filters.country
          }
        : {},
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
                city: {
                  contains: search
                }
              }
            ]
          }
        : {}
    ]
  };
}

export async function getSitesList(user: TenantUser, filters: SitesListFilters) {
  const where = buildSitesWhere(user, filters);
  const skip = (filters.page - 1) * MANAGEMENT_PAGE_SIZE;

  const [totalCount, sites, organizations, countries] = await Promise.all([
    prisma.site.count({ where }),
    prisma.site.findMany({
      where,
      orderBy: [
        {
          organization: {
            name: "asc"
          }
        },
        {
          name: "asc"
        }
      ],
      skip,
      take: MANAGEMENT_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        city: true,
        country: true,
        status: true,
        timezone: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            devices: true
          }
        }
      }
    }),
    getOrganizationOptions(user),
    prisma.site.findMany({
      where: {
        ...getScopedRecordWhere(user),
        country: {
          not: null
        }
      },
      distinct: ["country"],
      orderBy: {
        country: "asc"
      },
      select: {
        country: true
      }
    })
  ]);

  return {
    sites,
    organizations,
    countries: countries
      .map((item) => item.country)
      .filter((country): country is string => Boolean(country)),
    totalCount,
    pageSize: MANAGEMENT_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(totalCount / MANAGEMENT_PAGE_SIZE))
  };
}

export async function getSiteOptions(
  user: TenantUser,
  organizationId?: string | null
) {
  return prisma.site.findMany({
    where: {
      ...getScopedRecordWhere(user),
      ...(organizationId
        ? {
            organizationId
          }
        : {})
    },
    orderBy: [
      {
        organization: {
          name: "asc"
        }
      },
      {
        name: "asc"
      }
    ],
    select: {
      id: true,
      name: true,
      organizationId: true,
      organization: {
        select: {
          name: true
        }
      }
    }
  }).then((sites) =>
    sites.map((site) => ({
      id: site.id,
      name: site.name,
      organizationId: site.organizationId,
      organizationName: site.organization.name
    }))
  );
}

export async function getSiteDetail(user: TenantUser, id: string) {
  const site = await prisma.site.findFirst({
    where: {
      id,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true,
      name: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      stateRegion: true,
      postalCode: true,
      country: true,
      latitude: true,
      longitude: true,
      timezone: true,
      status: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      devices: {
        orderBy: {
          name: "asc"
        },
        take: 12,
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          brand: true,
          model: true,
          lastSeenAt: true
        }
      },
      _count: {
        select: {
          devices: true,
          alerts: true
        }
      }
    }
  });

  if (!site) {
    return null;
  }

  const deviceStatuses = await prisma.device.groupBy({
    by: ["status"],
    where: {
      siteId: site.id,
      organizationId: site.organizationId
    },
    _count: {
      _all: true
    }
  });

  return {
    ...site,
    deviceStatuses
  };
}

export async function getSiteForEdit(user: TenantUser, id: string) {
  return prisma.site.findFirst({
    where: {
      id,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true,
      name: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      stateRegion: true,
      postalCode: true,
      country: true,
      latitude: true,
      longitude: true,
      timezone: true,
      status: true,
      notes: true
    }
  });
}

export async function getSiteFormOptions(user: TenantUser) {
  return {
    organizations: await getOrganizationOptions(user)
  };
}
