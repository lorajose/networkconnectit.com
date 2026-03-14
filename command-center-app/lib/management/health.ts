import {
  AlertStatus,
  DeviceStatus,
  HealthCheckType,
  HealthStatus,
  Prisma
} from "@prisma/client";

import type { MapSiteRecord, SiteHealthRow, StatusTone } from "@/lib/dashboard/types";
import { prisma } from "@/lib/db";
import type { TenantUser } from "@/lib/management/tenant";
import { getScopedRecordWhere } from "@/lib/management/tenant";
import { canRunHealthSimulation } from "@/lib/rbac";
import {
  alertSeverityFromHealthStatus,
  deviceStatusFromHealthStatus,
  healthStatusFromDeviceStatus,
  healthStatusTone
} from "@/lib/status";
import { formatLocation } from "@/lib/utils";

const healthCheckWithContextSelect = {
  id: true,
  deviceId: true,
  checkType: true,
  status: true,
  latencyMs: true,
  message: true,
  checkedAt: true,
  device: {
    select: {
      id: true,
      name: true,
      organizationId: true,
      siteId: true,
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
  }
} satisfies Prisma.HealthCheckSelect;

const siteMonitoringSelect = {
  id: true,
  name: true,
  city: true,
  country: true,
  latitude: true,
  longitude: true,
  updatedAt: true,
  organization: {
    select: {
      id: true,
      name: true
    }
  },
  devices: {
    select: {
      id: true,
      name: true,
      status: true,
      lastSeenAt: true,
      healthChecks: {
        orderBy: {
          checkedAt: "desc"
        },
        take: 1,
        select: {
          id: true,
          status: true,
          checkedAt: true,
          latencyMs: true,
          message: true,
          checkType: true
        }
      }
    }
  }
} satisfies Prisma.SiteSelect;

type HealthCheckRecord = Prisma.HealthCheckGetPayload<{
  select: typeof healthCheckWithContextSelect;
}>;

type SiteMonitoringRecord = Prisma.SiteGetPayload<{
  select: typeof siteMonitoringSelect;
}>;

type DeviceHealthSource = SiteMonitoringRecord["devices"][number];

export type HealthTimelineEntry = {
  id: string;
  deviceId: string;
  deviceName: string;
  organizationId: string;
  organizationName: string;
  siteId: string;
  siteName: string;
  checkType: HealthCheckType;
  status: HealthStatus;
  latencyMs: number | null;
  message: string | null;
  checkedAt: Date;
};

export type DeviceHealthSummary = {
  latestStatus: HealthStatus;
  latestTone: StatusTone;
  latestLabel: string;
  latestCheckedAt: Date | null;
  latestMessage: string | null;
  latestLatencyMs: number | null;
};

export type SiteHealthRollup = {
  health: StatusTone;
  label: string;
  onlineCount: number;
  offlineCount: number;
  warningCount: number;
  unknownCount: number;
  devicesCount: number;
  lastCheckAt: Date | null;
};

type DeviceStatusCount = {
  status: DeviceStatus;
  _count: {
    _all: number;
  };
};

function deriveCurrentHealthStatus(device: DeviceHealthSource) {
  return device.healthChecks[0]?.status ?? healthStatusFromDeviceStatus(device.status);
}

function buildRollupFromDevices(devices: DeviceHealthSource[]): SiteHealthRollup {
  const lastCheckAt = devices.reduce<Date | null>((latest, device) => {
    const checkedAt = device.healthChecks[0]?.checkedAt ?? null;

    if (!checkedAt) {
      return latest;
    }

    if (!latest || checkedAt > latest) {
      return checkedAt;
    }

    return latest;
  }, null);

  const counts = devices.reduce(
    (accumulator, device) => {
      const healthStatus = deriveCurrentHealthStatus(device);

      switch (healthStatus) {
        case HealthStatus.HEALTHY:
          accumulator.onlineCount += 1;
          break;
        case HealthStatus.CRITICAL:
          accumulator.offlineCount += 1;
          break;
        case HealthStatus.WARNING:
          accumulator.warningCount += 1;
          break;
        case HealthStatus.UNKNOWN:
          accumulator.unknownCount += 1;
          break;
      }

      return accumulator;
    },
    {
      onlineCount: 0,
      offlineCount: 0,
      warningCount: 0,
      unknownCount: 0
    }
  );

  const devicesCount = devices.length;
  let health: StatusTone = "unknown";
  let label = "Unknown";

  if (counts.offlineCount > 0) {
    health = "critical";
    label = "Critical";
  } else if (counts.warningCount > 0) {
    health = "warning";
    label = "Warning";
  } else if (counts.onlineCount > 0 && counts.onlineCount === devicesCount) {
    health = "healthy";
    label = "Healthy";
  } else if (devicesCount > 0) {
    health = "unknown";
    label = "Unknown";
  }

  return {
    health,
    label,
    onlineCount: counts.onlineCount,
    offlineCount: counts.offlineCount,
    warningCount: counts.warningCount,
    unknownCount: counts.unknownCount,
    devicesCount,
    lastCheckAt
  };
}

export function deriveSiteHealthRollupFromStatusCounts(
  counts: DeviceStatusCount[],
  lastCheckAt: Date | null
): SiteHealthRollup {
  const onlineCount =
    counts.find((entry) => entry.status === DeviceStatus.ONLINE)?._count._all ?? 0;
  const offlineCount =
    counts.find((entry) => entry.status === DeviceStatus.OFFLINE)?._count._all ?? 0;
  const warningCount = counts.reduce((total, entry) => {
    if (
      entry.status === DeviceStatus.DEGRADED ||
      entry.status === DeviceStatus.MAINTENANCE
    ) {
      return total + entry._count._all;
    }

    return total;
  }, 0);
  const unknownCount =
    counts.find((entry) => entry.status === DeviceStatus.UNKNOWN)?._count._all ?? 0;
  const devicesCount = counts.reduce(
    (total, entry) => total + entry._count._all,
    0
  );

  let health: StatusTone = "unknown";
  let label = "Unknown";

  if (offlineCount > 0) {
    health = "critical";
    label = "Critical";
  } else if (warningCount > 0) {
    health = "warning";
    label = "Warning";
  } else if (onlineCount > 0 && onlineCount === devicesCount) {
    health = "healthy";
    label = "Healthy";
  }

  return {
    health,
    label,
    onlineCount,
    offlineCount,
    warningCount,
    unknownCount,
    devicesCount,
    lastCheckAt
  };
}

function buildHealthTimelineEntry(check: HealthCheckRecord): HealthTimelineEntry {
  return {
    id: check.id,
    deviceId: check.device.id,
    deviceName: check.device.name,
    organizationId: check.device.organization.id,
    organizationName: check.device.organization.name,
    siteId: check.device.site.id,
    siteName: check.device.site.name,
    checkType: check.checkType,
    status: check.status,
    latencyMs: check.latencyMs ?? null,
    message: check.message ?? null,
    checkedAt: check.checkedAt
  };
}

function buildSiteHealthRow(site: SiteMonitoringRecord): SiteHealthRow {
  const rollup = buildRollupFromDevices(site.devices);

  return {
    id: site.id,
    organization: site.organization.name,
    organizationHref: `/organizations/${site.organization.id}`,
    site: site.name,
    siteHref: `/sites/${site.id}`,
    location: formatLocation([site.city, site.country]),
    devicesCount: rollup.devicesCount,
    onlineCount: rollup.onlineCount,
    offlineCount: rollup.offlineCount,
    warningCount: rollup.warningCount,
    unknownCount: rollup.unknownCount,
    lastCheck: rollup.lastCheckAt?.toISOString() ?? null,
    health: rollup.health
  };
}

function buildMapSiteRecord(
  site: SiteMonitoringRecord,
  row: SiteHealthRow
): MapSiteRecord | null {
  if (site.latitude === null || site.longitude === null) {
    return null;
  }

  return {
    id: site.id,
    organizationName: site.organization.name,
    siteName: site.name,
    city: site.city ?? "Unknown city",
    country: site.country ?? "Unknown country",
    status: row.health,
    deviceCount: row.devicesCount,
    coordinates: [site.latitude, site.longitude],
    detailsHref: `/sites/${site.id}`
  };
}

function getNextHealthStatus(status: HealthStatus) {
  switch (status) {
    case HealthStatus.UNKNOWN:
      return HealthStatus.HEALTHY;
    case HealthStatus.HEALTHY:
      return HealthStatus.WARNING;
    case HealthStatus.WARNING:
      return HealthStatus.CRITICAL;
    case HealthStatus.CRITICAL:
      return HealthStatus.HEALTHY;
  }
}

function getSimulatedHealthPayload(status: HealthStatus) {
  switch (status) {
    case HealthStatus.HEALTHY:
      return {
        latencyMs: 28,
        message: "Device responded normally during the simulated health check."
      };
    case HealthStatus.WARNING:
      return {
        latencyMs: 180,
        message: "Device responded slowly and requires review."
      };
    case HealthStatus.CRITICAL:
      return {
        latencyMs: 950,
        message: "Device failed the simulated connectivity threshold."
      };
    case HealthStatus.UNKNOWN:
      return {
        latencyMs: null,
        message: "Device telemetry is unavailable in the simulated run."
      };
  }
}

async function syncHealthAlertForDevice(
  tx: Prisma.TransactionClient,
  device: {
    id: string;
    name: string;
    organizationId: string;
    siteId: string;
  },
  actorId: string | null,
  status: HealthStatus,
  message: string,
  checkedAt: Date
) {
  const unresolvedAlerts = await tx.alert.findMany({
    where: {
      deviceId: device.id,
      title: {
        startsWith: "Health check:"
      },
      status: {
        in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED]
      }
    },
    select: {
      id: true,
      status: true
    }
  });

  if (status === HealthStatus.HEALTHY) {
    if (unresolvedAlerts.length === 0) {
      return;
    }

    await tx.alert.updateMany({
      where: {
        id: {
          in: unresolvedAlerts.map((alert) => alert.id)
        }
      },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedAt: checkedAt,
        resolvedById: actorId
      }
    });

    return;
  }

  if (unresolvedAlerts.length > 0) {
    await tx.alert.update({
      where: {
        id: unresolvedAlerts[0].id
      },
      data: {
        severity: alertSeverityFromHealthStatus(status),
        message,
        createdById: actorId
      }
    });

    return;
  }

  await tx.alert.create({
    data: {
      organizationId: device.organizationId,
      siteId: device.siteId,
      deviceId: device.id,
      title: `Health check: ${device.name}`,
      message,
      severity: alertSeverityFromHealthStatus(status),
      status: AlertStatus.OPEN,
      triggeredAt: checkedAt,
      createdById: actorId
    }
  });
}

async function createSimulatedHealthCheck(
  tx: Prisma.TransactionClient,
  device: {
    id: string;
    name: string;
    organizationId: string;
    siteId: string;
    status: DeviceStatus;
    latestHealthStatus: HealthStatus;
  },
  actorId: string | null,
  nextStatus?: HealthStatus
) {
  const status = nextStatus ?? getNextHealthStatus(device.latestHealthStatus);
  const payload = getSimulatedHealthPayload(status);
  const checkedAt = new Date();

  await tx.healthCheck.create({
    data: {
      deviceId: device.id,
      checkType: HealthCheckType.SIMULATED,
      status,
      latencyMs: payload.latencyMs,
      message: payload.message,
      checkedAt
    }
  });

  await tx.device.update({
    where: {
      id: device.id
    },
    data: {
      status: deviceStatusFromHealthStatus(status),
      lastSeenAt: checkedAt
    }
  });

  await syncHealthAlertForDevice(
    tx,
    device,
    actorId,
    status,
    payload.message,
    checkedAt
  );
}

export async function getDeviceHealthTimeline(
  user: TenantUser,
  deviceId: string,
  limit = 12
) {
  const checks = await prisma.healthCheck.findMany({
    where: {
      deviceId,
      device: {
        is: getScopedRecordWhere(user)
      }
    },
    orderBy: {
      checkedAt: "desc"
    },
    take: limit,
    select: healthCheckWithContextSelect
  });

  return checks.map(buildHealthTimelineEntry);
}

export async function getSiteHealthTimeline(
  user: TenantUser,
  siteId: string,
  limit = 16
) {
  const checks = await prisma.healthCheck.findMany({
    where: {
      device: {
        is: {
          siteId,
          ...getScopedRecordWhere(user)
        }
      }
    },
    orderBy: {
      checkedAt: "desc"
    },
    take: limit,
    select: healthCheckWithContextSelect
  });

  return checks.map(buildHealthTimelineEntry);
}

export async function getProjectHealthTimeline(
  user: TenantUser,
  projectInstallationId: string,
  limit = 16
) {
  const checks = await prisma.healthCheck.findMany({
    where: {
      device: {
        is: {
          projectInstallationId,
          ...getScopedRecordWhere(user)
        }
      }
    },
    orderBy: {
      checkedAt: "desc"
    },
    take: limit,
    select: healthCheckWithContextSelect
  });

  return checks.map(buildHealthTimelineEntry);
}

export function deriveDeviceHealthSummary(
  status: DeviceStatus,
  timeline: HealthTimelineEntry[]
): DeviceHealthSummary {
  const latestCheck = timeline[0];
  const latestStatus = latestCheck?.status ?? healthStatusFromDeviceStatus(status);

  return {
    latestStatus,
    latestTone: healthStatusTone(latestStatus),
    latestLabel: latestStatus.toLowerCase(),
    latestCheckedAt: latestCheck?.checkedAt ?? null,
    latestMessage: latestCheck?.message ?? null,
    latestLatencyMs: latestCheck?.latencyMs ?? null
  };
}

export async function getScopedSiteMonitoringDataset(
  user: TenantUser,
  options?: {
    projectInstallationId?: string;
  }
) {
  const sites = await prisma.site.findMany({
    where: {
      ...getScopedRecordWhere(user),
      ...(options?.projectInstallationId
        ? {
            projectSites: {
              some: {
                projectInstallationId: options.projectInstallationId
              }
            }
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
      ...siteMonitoringSelect,
      devices: {
        ...siteMonitoringSelect.devices,
        ...(options?.projectInstallationId
          ? {
              where: {
                projectInstallationId: options.projectInstallationId
              }
            }
          : {})
      }
    }
  });

  const rows = sites.map(buildSiteHealthRow);
  const mapSites = sites
    .map((site, index) => buildMapSiteRecord(site, rows[index]))
    .filter((site): site is MapSiteRecord => Boolean(site));

  return {
    rows,
    mapSites,
    healthySites: rows.filter((row) => row.health === "healthy").length,
    warningSites: rows.filter((row) => row.health === "warning").length,
    criticalSites: rows.filter((row) => row.health === "critical").length,
    unknownDevices: rows.reduce(
      (total, row) => total + (row.unknownCount ?? 0),
      0
    )
  };
}

export async function simulateDeviceHealthRun(user: TenantUser, deviceId: string) {
  if (!canRunHealthSimulation(user.role)) {
    return null;
  }

  const device = await prisma.device.findFirst({
    where: {
      id: deviceId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      name: true,
      organizationId: true,
      siteId: true,
      status: true,
      healthChecks: {
        orderBy: {
          checkedAt: "desc"
        },
        take: 1,
        select: {
          status: true
        }
      }
    }
  });

  if (!device) {
    return null;
  }

  await prisma.$transaction(async (tx) => {
    await createSimulatedHealthCheck(
      tx,
      {
        ...device,
        latestHealthStatus:
          device.healthChecks[0]?.status ?? healthStatusFromDeviceStatus(device.status)
      },
      user.id ?? null
    );
  });

  return true;
}

export async function simulateSiteHealthRun(user: TenantUser, siteId: string) {
  if (!canRunHealthSimulation(user.role)) {
    return null;
  }

  const site = await prisma.site.findFirst({
    where: {
      id: siteId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      devices: {
        orderBy: {
          name: "asc"
        },
        select: {
          id: true,
          name: true,
          organizationId: true,
          siteId: true,
          status: true,
          healthChecks: {
            orderBy: {
              checkedAt: "desc"
            },
            take: 1,
            select: {
              status: true
            }
          }
        }
      }
    }
  });

  if (!site || site.devices.length === 0) {
    return null;
  }

  const offset = new Date().getMinutes() % 4;
  const statuses = [
    HealthStatus.HEALTHY,
    HealthStatus.WARNING,
    HealthStatus.CRITICAL,
    HealthStatus.UNKNOWN
  ] as const;

  await prisma.$transaction(async (tx) => {
    for (const [index, device] of site.devices.entries()) {
      await createSimulatedHealthCheck(
        tx,
        {
          ...device,
          latestHealthStatus:
            device.healthChecks[0]?.status ?? healthStatusFromDeviceStatus(device.status)
        },
        user.id ?? null,
        statuses[(index + offset) % statuses.length]
      );
    }
  });

  return true;
}
