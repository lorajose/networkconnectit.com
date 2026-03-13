import { DeviceStatus, DeviceType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { MANAGEMENT_PAGE_SIZE, getOrganizationOptions } from "@/lib/management/organizations";
import { getSiteOptions } from "@/lib/management/sites";
import {
  getScopedRecordWhere,
  type TenantUser
} from "@/lib/management/tenant";

export type DevicesListFilters = {
  query: string;
  organizationId: string;
  siteId: string;
  brand: string;
  type: DeviceType | "";
  status: DeviceStatus | "";
  page: number;
};

function buildDevicesWhere(
  user: TenantUser,
  filters: DevicesListFilters
): Prisma.DeviceWhereInput {
  const search = filters.query.trim();

  return {
    AND: [
      getScopedRecordWhere(user),
      filters.organizationId
        ? {
            organizationId: filters.organizationId
          }
        : {},
      filters.siteId
        ? {
            siteId: filters.siteId
          }
        : {},
      filters.brand
        ? {
            brand: filters.brand
          }
        : {},
      filters.type
        ? {
            type: filters.type
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
                model: {
                  contains: search
                }
              },
              {
                ipAddress: {
                  contains: search
                }
              }
            ]
          }
        : {}
    ]
  };
}

export async function getDevicesList(
  user: TenantUser,
  filters: DevicesListFilters
) {
  const where = buildDevicesWhere(user, filters);
  const skip = (filters.page - 1) * MANAGEMENT_PAGE_SIZE;

  const [totalCount, devices, organizations, sites, brands] =
    await Promise.all([
      prisma.device.count({ where }),
      prisma.device.findMany({
        where,
        orderBy: [
          {
            organization: {
              name: "asc"
            }
          },
          {
            site: {
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
          type: true,
          brand: true,
          model: true,
          ipAddress: true,
          status: true,
          monitoringMode: true,
          lastSeenAt: true,
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
          }
        }
      }),
      getOrganizationOptions(user),
      getSiteOptions(user),
      prisma.device.findMany({
        where: {
          ...getScopedRecordWhere(user),
          brand: {
            not: null
          }
        },
        distinct: ["brand"],
        orderBy: {
          brand: "asc"
        },
        select: {
          brand: true
        }
      })
    ]);

  return {
    devices,
    organizations,
    sites,
    brands: brands
      .map((item) => item.brand)
      .filter((brand): brand is string => Boolean(brand)),
    totalCount,
    pageSize: MANAGEMENT_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(totalCount / MANAGEMENT_PAGE_SIZE))
  };
}

export async function getDeviceDetail(user: TenantUser, id: string) {
  return prisma.device.findFirst({
    where: {
      id,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true,
      siteId: true,
      name: true,
      type: true,
      brand: true,
      model: true,
      ipAddress: true,
      macAddress: true,
      serialNumber: true,
      status: true,
      monitoringMode: true,
      lastSeenAt: true,
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
      site: {
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
          status: true
        }
      }
    }
  });
}

export async function getDeviceForEdit(user: TenantUser, id: string) {
  return prisma.device.findFirst({
    where: {
      id,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true,
      siteId: true,
      name: true,
      type: true,
      brand: true,
      model: true,
      ipAddress: true,
      macAddress: true,
      serialNumber: true,
      status: true,
      monitoringMode: true,
      lastSeenAt: true,
      notes: true
    }
  });
}

export async function getDeviceFormOptions(user: TenantUser) {
  const [organizations, sites] = await Promise.all([
    getOrganizationOptions(user),
    getSiteOptions(user)
  ]);

  return {
    organizations,
    sites
  };
}
