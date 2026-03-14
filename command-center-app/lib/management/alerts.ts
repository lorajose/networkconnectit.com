import {
  AlertSeverity,
  AlertStatus,
  Prisma
} from "@prisma/client";

import type { AlertTableRow } from "@/lib/dashboard/types";
import { prisma } from "@/lib/db";
import { MANAGEMENT_PAGE_SIZE, getOrganizationOptions } from "@/lib/management/organizations";
import { getProjectOptions } from "@/lib/management/projects";
import { getSiteOptions } from "@/lib/management/sites";
import {
  getScopedRecordWhere,
  type TenantUser
} from "@/lib/management/tenant";

const alertWithRelationsSelect = {
  id: true,
  title: true,
  message: true,
  severity: true,
  status: true,
  triggeredAt: true,
  createdAt: true,
  acknowledgedAt: true,
  resolvedAt: true,
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
  device: {
    select: {
      id: true,
      name: true
    }
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  resolvedBy: {
    select: {
      id: true,
      name: true,
      email: true
    }
  }
} satisfies Prisma.AlertSelect;

export type AlertRecord = Prisma.AlertGetPayload<{
  select: typeof alertWithRelationsSelect;
}>;

export type AlertsListFilters = {
  query: string;
  organizationId: string;
  siteId: string;
  projectInstallationId: string;
  severity: AlertSeverity | "";
  status: AlertStatus | "";
  page: number;
};

function buildAlertsWhere(
  user: TenantUser,
  filters: AlertsListFilters
): Prisma.AlertWhereInput {
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
            OR: [
              {
                device: {
                  is: {
                    projectInstallationId: filters.projectInstallationId
                  }
                }
              },
              {
                site: {
                  is: {
                    projectSites: {
                      some: {
                        projectInstallationId: filters.projectInstallationId
                      }
                    }
                  }
                }
              }
            ]
          }
        : {},
      filters.severity
        ? {
            severity: filters.severity
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
                title: {
                  contains: search
                }
              },
              {
                message: {
                  contains: search
                }
              }
            ]
          }
        : {}
    ]
  };
}

export function toDashboardAlertRow(alert: AlertRecord): AlertTableRow {
  return {
    id: alert.id,
    severity: alert.severity.toLowerCase() as AlertTableRow["severity"],
    title: alert.title,
    organization: alert.organization.name,
    site: alert.site?.name ?? "Unassigned",
    device: alert.device?.name ?? "N/A",
    status: alert.status.toLowerCase() as AlertTableRow["status"],
    createdAt: alert.createdAt.toISOString(),
    alertHref: `/alerts/${alert.id}`,
    organizationHref: `/organizations/${alert.organization.id}`,
    siteHref: alert.site ? `/sites/${alert.site.id}` : undefined,
    deviceHref: alert.device ? `/devices/${alert.device.id}` : undefined
  };
}

export async function getAlertsList(user: TenantUser, filters: AlertsListFilters) {
  const where = buildAlertsWhere(user, filters);
  const skip = (filters.page - 1) * MANAGEMENT_PAGE_SIZE;

  const [totalCount, alerts, organizations, sites, projects] = await Promise.all([
    prisma.alert.count({ where }),
    prisma.alert.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take: MANAGEMENT_PAGE_SIZE,
      select: alertWithRelationsSelect
    }),
    getOrganizationOptions(user),
    getSiteOptions(user, filters.organizationId || undefined),
    getProjectOptions(user, filters.organizationId || undefined)
  ]);

  return {
    alerts,
    organizations,
    sites,
    projects,
    totalCount,
    pageSize: MANAGEMENT_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(totalCount / MANAGEMENT_PAGE_SIZE))
  };
}

export async function getAlertDetail(user: TenantUser, id: string) {
  return prisma.alert.findFirst({
    where: {
      id,
      ...getScopedRecordWhere(user)
    },
    select: alertWithRelationsSelect
  });
}

export async function getRecentAlertsForScope(
  user: TenantUser,
  options?: {
    siteId?: string;
    deviceId?: string;
    projectInstallationId?: string;
    limit?: number;
  }
) {
  return prisma.alert.findMany({
    where: {
      ...getScopedRecordWhere(user),
      ...(options?.siteId
        ? {
            siteId: options.siteId
          }
        : {}),
      ...(options?.deviceId
        ? {
            deviceId: options.deviceId
          }
        : {}),
      ...(options?.projectInstallationId
        ? {
            OR: [
              {
                device: {
                  is: {
                    projectInstallationId: options.projectInstallationId
                  }
                }
              },
              {
                site: {
                  is: {
                    projectSites: {
                      some: {
                        projectInstallationId: options.projectInstallationId
                      }
                    }
                  }
                }
              }
            ]
          }
        : {})
    },
    orderBy: {
      createdAt: "desc"
    },
    take: options?.limit ?? 8,
    select: alertWithRelationsSelect
  });
}

export async function getRecentAlertsTableRows(
  user: TenantUser,
  limit = 8,
  options?: {
    siteId?: string;
    deviceId?: string;
    projectInstallationId?: string;
  }
): Promise<AlertTableRow[]> {
  const alerts = await getRecentAlertsForScope(user, {
    ...options,
    limit
  });

  return alerts.map(toDashboardAlertRow);
}

export async function acknowledgeAlert(
  user: TenantUser,
  alertId: string
) {
  const alert = await prisma.alert.findFirst({
    where: {
      id: alertId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      siteId: true,
      deviceId: true,
      status: true
    }
  });

  if (!alert || alert.status !== AlertStatus.OPEN) {
    return null;
  }

  return prisma.alert.update({
    where: {
      id: alert.id
    },
    data: {
      status: AlertStatus.ACKNOWLEDGED,
      acknowledgedAt: new Date()
    },
    select: {
      id: true,
      siteId: true,
      deviceId: true,
      status: true
    }
  });
}

export async function resolveAlert(user: TenantUser, alertId: string) {
  const alert = await prisma.alert.findFirst({
    where: {
      id: alertId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      siteId: true,
      deviceId: true,
      status: true
    }
  });

  if (!alert || alert.status === AlertStatus.RESOLVED) {
    return null;
  }

  return prisma.alert.update({
    where: {
      id: alert.id
    },
    data: {
      status: AlertStatus.RESOLVED,
      resolvedAt: new Date(),
      resolvedById: user.id ?? null
    },
    select: {
      id: true,
      siteId: true,
      deviceId: true,
      status: true
    }
  });
}
