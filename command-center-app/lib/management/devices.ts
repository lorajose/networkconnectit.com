import { DeviceStatus, DeviceType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { MANAGEMENT_PAGE_SIZE, getOrganizationOptions } from "@/lib/management/organizations";
import { getProjectOptions } from "@/lib/management/projects";
import { getSiteOptions } from "@/lib/management/sites";
import { getNetworkSegmentOptions } from "@/lib/management/infrastructure";
import {
  getScopedRecordWhere,
  type TenantUser
} from "@/lib/management/tenant";

export type DevicesListFilters = {
  query: string;
  organizationId: string;
  siteId: string;
  projectInstallationId: string;
  brand: string;
  type: DeviceType | "";
  status: DeviceStatus | "";
  page: number;
};

export type NetworkSegmentOption = {
  id: string;
  name: string;
  organizationId: string;
  siteId: string;
  label: string;
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
      filters.projectInstallationId
        ? {
            projectInstallationId: filters.projectInstallationId
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

  const [totalCount, devices, organizations, sites, projects, brands] =
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
          },
          projectInstallation: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      getOrganizationOptions(user),
      getSiteOptions(user, filters.organizationId || undefined),
      getProjectOptions(user, filters.organizationId || undefined),
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
    projects,
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
      projectInstallationId: true,
      networkSegmentId: true,
      name: true,
      hostname: true,
      type: true,
      brand: true,
      model: true,
      firmwareVersion: true,
      vendorExternalId: true,
      ipAddress: true,
      macAddress: true,
      serialNumber: true,
      switchRole: true,
      portCount: true,
      usedPortCount: true,
      poeBudgetWatts: true,
      poeUsedWatts: true,
      poeRequired: true,
      estimatedPoeWatts: true,
      status: true,
      monitoringMode: true,
      installedAt: true,
      lastSeenAt: true,
      notes: true,
      deviceGroupId: true,
      rackId: true,
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
      },
      projectInstallation: {
        select: {
          id: true,
          name: true,
          status: true
        }
      },
      networkSegment: {
        select: {
          id: true,
          name: true,
          vlanId: true,
          subnetCidr: true
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
      projectInstallationId: true,
      networkSegmentId: true,
      name: true,
      hostname: true,
      type: true,
      brand: true,
      model: true,
      firmwareVersion: true,
      vendorExternalId: true,
      ipAddress: true,
      macAddress: true,
      serialNumber: true,
      switchRole: true,
      portCount: true,
      usedPortCount: true,
      poeBudgetWatts: true,
      poeUsedWatts: true,
      poeRequired: true,
      estimatedPoeWatts: true,
      status: true,
      monitoringMode: true,
      installedAt: true,
      lastSeenAt: true,
      notes: true
    }
  });
}

export async function getDeviceFormOptions(user: TenantUser) {
  const [organizations, sites, projects] = await Promise.all([
    getOrganizationOptions(user),
    getSiteOptions(user),
    getProjectOptions(user)
  ]);

  const networkSegments = (
    await Promise.all(
      sites.map(async (site) => {
        const segments = await getNetworkSegmentOptions(user, site.id);

        return segments.map((segment) => ({
          id: segment.id,
          name: segment.name,
          organizationId: site.organizationId,
          siteId: site.id,
          label: `${segment.name}${segment.vlanId ? ` · VLAN ${segment.vlanId}` : ""}`
        }));
      })
    )
  ).flat();

  return {
    organizations,
    sites,
    projects,
    networkSegments
  };
}
