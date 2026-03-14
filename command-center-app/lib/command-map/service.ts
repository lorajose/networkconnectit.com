import {
  AlertSeverity,
  AlertStatus,
  DeviceStatus,
  DeviceType,
  Prisma
} from "@prisma/client";

import type { DashboardMetric, FilterToken, StatusTone } from "@/lib/dashboard/types";
import { prisma } from "@/lib/db";
import type {
  CommandMapFilters,
  CommandMapHealthState,
  CommandMapIssueSite,
  CommandMapMonitoringActivity,
  CommandMapRecentAlert,
  CommandMapSiteRecord,
  CommandMapSnapshot
} from "@/lib/command-map/types";
import {
  commandMapAlertSeverityPresenceOptions,
  commandMapHealthStates,
  commandMapOfflinePresenceOptions
} from "@/lib/command-map/types";
import { deriveSiteHealthRollupFromStatusCounts } from "@/lib/management/health";
import { getOrganizationOptions } from "@/lib/management/organizations";
import { getProjectOptions } from "@/lib/management/projects";
import {
  getScopedRecordWhere,
  type TenantUser
} from "@/lib/management/tenant";
import { formatEnumLabel } from "@/lib/utils";

type SiteDeviceRecord = {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  healthChecks: Array<{
    status: "UNKNOWN" | "HEALTHY" | "WARNING" | "CRITICAL";
    checkedAt: Date;
    message: string | null;
  }>;
};

type SiteMapRecord = Prisma.SiteGetPayload<{
  select: {
    id: true;
    name: true;
    city: true;
    country: true;
    latitude: true;
    longitude: true;
    organizationId: true;
    organization: {
      select: {
        id: true;
        name: true;
      };
    };
    projectSites: {
      select: {
        projectInstallation: {
          select: {
            id: true;
            name: true;
          };
        };
      };
    };
    devices: {
      select: {
        id: true;
        name: true;
        type: true;
        status: true;
        healthChecks: {
          orderBy: {
            checkedAt: "desc";
          };
          take: 1;
          select: {
            status: true;
            checkedAt: true;
            message: true;
          };
        };
      };
    };
  };
}>;

type AlertRecord = Prisma.AlertGetPayload<{
  select: {
    id: true;
    title: true;
    severity: true;
    status: true;
    createdAt: true;
    siteId: true;
    device: {
      select: {
        id: true;
        name: true;
        projectInstallationId: true;
      };
    };
    site: {
      select: {
        id: true;
        name: true;
        projectSites: {
          select: {
            projectInstallation: {
              select: {
                id: true;
                name: true;
              };
            };
          };
        };
      };
    };
    organization: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;

type MonitoringActivityRecord = Prisma.HealthCheckGetPayload<{
  select: {
    id: true;
    status: true;
    checkedAt: true;
    message: true;
    device: {
      select: {
        id: true;
        name: true;
        siteId: true;
        site: {
          select: {
            id: true;
            name: true;
          };
        };
        organization: {
          select: {
            id: true;
            name: true;
          };
        };
      };
    };
  };
}>;

type ParsedSeverityPresence = "" | "ANY" | AlertSeverity;

const activeAlertStatuses = [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] as const;

function buildScopedSitesWhere(
  user: TenantUser,
  filters: CommandMapFilters
): Prisma.SiteWhereInput {
  return {
    ...getScopedRecordWhere(user),
    ...(filters.organizationId
      ? {
          organizationId: filters.organizationId
        }
      : {}),
    ...(filters.projectInstallationId
      ? {
          projectSites: {
            some: {
              projectInstallationId: filters.projectInstallationId
            }
          }
        }
      : {}),
    ...(filters.country
      ? {
          country: filters.country
        }
      : {})
  };
}

function buildScopedDevicesWhere(
  filters: CommandMapFilters,
  siteId?: string
): Prisma.DeviceWhereInput {
  return {
    ...(siteId
      ? {
          siteId
        }
      : {}),
    ...(filters.projectInstallationId
      ? {
          projectInstallationId: filters.projectInstallationId
        }
      : {})
  };
}

function buildScopedAlertsWhere(
  user: TenantUser,
  filters: CommandMapFilters,
  siteIds: string[]
): Prisma.AlertWhereInput {
  return {
    ...getScopedRecordWhere(user),
    siteId: {
      in: siteIds
    },
    status: {
      in: [...activeAlertStatuses]
    },
    ...(filters.projectInstallationId
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
      : {})
  };
}

function toSiteStatusCounts(devices: SiteDeviceRecord[]) {
  const counts = devices.reduce<Map<DeviceStatus, number>>((accumulator, device) => {
    accumulator.set(device.status, (accumulator.get(device.status) ?? 0) + 1);
    return accumulator;
  }, new Map());

  return Array.from(counts.entries()).map(([status, count]) => ({
    status,
    _count: {
      _all: count
    }
  }));
}

function getLatestHealthActivity(devices: SiteDeviceRecord[]) {
  return devices.reduce<{
    checkedAt: Date;
    message: string | null;
    status: StatusTone;
    deviceName: string;
  } | null>((latest, device) => {
    const currentCheck = device.healthChecks[0];

    if (!currentCheck) {
      return latest;
    }

    if (!latest || currentCheck.checkedAt > latest.checkedAt) {
      return {
        checkedAt: currentCheck.checkedAt,
        message: currentCheck.message,
        status:
          currentCheck.status === "HEALTHY"
            ? "healthy"
            : currentCheck.status === "WARNING"
              ? "warning"
              : currentCheck.status === "CRITICAL"
                ? "critical"
                : "unknown",
        deviceName: device.name
      };
    }

    return latest;
  }, null);
}

function getDeviceTypeCounts(devices: SiteDeviceRecord[]) {
  return devices.reduce(
    (accumulator, device) => {
      switch (device.type) {
        case DeviceType.ROUTER:
          accumulator.routers += 1;
          break;
        case DeviceType.SWITCH:
          accumulator.switches += 1;
          break;
        case DeviceType.NVR:
          accumulator.nvrs += 1;
          break;
        case DeviceType.CAMERA:
          accumulator.cameras += 1;
          break;
        case DeviceType.ACCESS_POINT:
          accumulator.accessPoints += 1;
          break;
        default:
          accumulator.other += 1;
          break;
      }

      return accumulator;
    },
    {
      routers: 0,
      switches: 0,
      nvrs: 0,
      cameras: 0,
      accessPoints: 0,
      other: 0
    }
  );
}

function buildMapCenter(
  coordinates: Array<[number, number]>,
  fallback: [number, number]
): [number, number] {
  if (coordinates.length === 0) {
    return fallback;
  }

  const sums = coordinates.reduce(
    (accumulator, coordinate) => [
      accumulator[0] + coordinate[0],
      accumulator[1] + coordinate[1]
    ],
    [0, 0]
  );

  return [sums[0] / coordinates.length, sums[1] / coordinates.length];
}

function buildMapZoom(siteCount: number) {
  if (siteCount <= 1) {
    return 9;
  }

  if (siteCount <= 4) {
    return 5;
  }

  if (siteCount <= 12) {
    return 3;
  }

  return 2;
}

function parseAlertSeverityPresence(
  value: CommandMapFilters["alertSeverityPresence"]
): ParsedSeverityPresence {
  if (!value) {
    return "";
  }

  if (value === "any") {
    return "ANY";
  }

  return value.toUpperCase() as AlertSeverity;
}

function hasRequiredHealthState(
  site: CommandMapSiteRecord,
  state: CommandMapHealthState | ""
) {
  if (!state) {
    return true;
  }

  return site.health === state;
}

function hasRequiredAlertPresence(
  site: CommandMapSiteRecord,
  severityPresence: ParsedSeverityPresence
) {
  if (!severityPresence) {
    return true;
  }

  if (severityPresence === "ANY") {
    return site.activeAlerts > 0;
  }

  return site.alertSeverities.includes(
    severityPresence.toLowerCase() as CommandMapSiteRecord["alertSeverities"][number]
  );
}

function hasRequiredOfflinePresence(
  site: CommandMapSiteRecord,
  offlinePresence: CommandMapFilters["offlinePresence"]
) {
  if (!offlinePresence) {
    return true;
  }

  if (offlinePresence === "with_offline") {
    return site.offlineDevices > 0;
  }

  return site.offlineDevices === 0;
}

function buildActiveFilters(snapshot: {
  organizationName?: string;
  projectName?: string;
  filters: CommandMapFilters;
}): FilterToken[] {
  return [
    ...(snapshot.organizationName
      ? [
          {
            id: "organization",
            label: "Organization",
            value: snapshot.organizationName
          }
        ]
      : []),
    ...(snapshot.projectName
      ? [
          {
            id: "project",
            label: "Project",
            value: snapshot.projectName
          }
        ]
      : []),
    ...(snapshot.filters.country
      ? [
          {
            id: "country",
            label: "Country",
            value: snapshot.filters.country
          }
        ]
      : []),
    ...(snapshot.filters.healthState
      ? [
          {
            id: "health",
            label: "Health",
            value: formatEnumLabel(snapshot.filters.healthState)
          }
        ]
      : []),
    ...(snapshot.filters.alertSeverityPresence
      ? [
          {
            id: "alert-presence",
            label: "Alert presence",
            value:
              snapshot.filters.alertSeverityPresence === "any"
                ? "Any active alert"
                : `${formatEnumLabel(snapshot.filters.alertSeverityPresence)} alerts`
          }
        ]
      : []),
    ...(snapshot.filters.offlinePresence
      ? [
          {
            id: "offline",
            label: "Offline devices",
            value:
              snapshot.filters.offlinePresence === "with_offline"
                ? "Has offline devices"
                : "No offline devices"
          }
        ]
      : []),
    {
      id: "source",
      label: "Data source",
      value: "Prisma + MySQL"
    }
  ];
}

function buildMetrics(sites: CommandMapSiteRecord[]): DashboardMetric[] {
  const healthySites = sites.filter((site) => site.health === "healthy").length;
  const warningSites = sites.filter((site) => site.health === "warning").length;
  const criticalSites = sites.filter((site) => site.health === "critical").length;
  const activeAlerts = sites.reduce((total, site) => total + site.activeAlerts, 0);
  const offlineDevices = sites.reduce(
    (total, site) => total + site.offlineDevices,
    0
  );

  return [
    {
      id: "command-map-sites",
      label: "Total monitored sites",
      value: sites.length.toLocaleString("en-US"),
      helper: "Sites in the current global command scope.",
      icon: "sites",
      tone: "cyan"
    },
    {
      id: "command-map-healthy-sites",
      label: "Healthy sites",
      value: healthySites.toLocaleString("en-US"),
      helper: "Sites operating within normal thresholds.",
      icon: "online",
      tone: "healthy"
    },
    {
      id: "command-map-warning-sites",
      label: "Warning sites",
      value: warningSites.toLocaleString("en-US"),
      helper: "Sites with degraded posture or unresolved review items.",
      icon: "alerts",
      tone: "warning"
    },
    {
      id: "command-map-critical-sites",
      label: "Critical sites",
      value: criticalSites.toLocaleString("en-US"),
      helper: "Sites with offline assets or active critical incidents.",
      icon: "offline",
      tone: "critical"
    },
    {
      id: "command-map-active-alerts",
      label: "Total active alerts",
      value: activeAlerts.toLocaleString("en-US"),
      helper: "Open or acknowledged alerts affecting the visible estate.",
      icon: "alerts",
      tone: "warning"
    },
    {
      id: "command-map-devices-offline",
      label: "Devices offline",
      value: offlineDevices.toLocaleString("en-US"),
      helper: "Offline devices across the current site scope.",
      icon: "offline",
      tone: "critical"
    }
  ];
}

function tonePriority(tone: StatusTone) {
  switch (tone) {
    case "critical":
      return 0;
    case "warning":
      return 1;
    case "unknown":
      return 2;
    case "healthy":
      return 3;
    case "info":
      return 4;
  }
}

function deriveSiteHealth(
  baseHealth: StatusTone,
  activeAlerts: number,
  criticalAlerts: number
): StatusTone {
  if (criticalAlerts > 0) {
    return "critical";
  }

  if (baseHealth === "critical") {
    return "critical";
  }

  if (activeAlerts > 0 && baseHealth === "healthy") {
    return "warning";
  }

  return baseHealth;
}

function buildIssueSite(site: CommandMapSiteRecord): CommandMapIssueSite {
  return {
    id: site.id,
    siteName: site.siteName,
    siteHref: site.siteHref,
    organizationName: site.organizationName,
    projectName: site.primaryProject?.name ?? null,
    projectHref: site.primaryProject?.href ?? null,
    health: site.health,
    activeAlerts: site.activeAlerts,
    offlineDevices: site.offlineDevices,
    deviceCount: site.deviceCount,
    latestHealthAt: site.latestHealthAt
  };
}

function toRecentAlertRow(alert: AlertRecord): CommandMapRecentAlert {
  return {
    id: alert.id,
    title: alert.title,
    severity: alert.severity.toLowerCase() as CommandMapRecentAlert["severity"],
    status: alert.status.toLowerCase() as CommandMapRecentAlert["status"],
    organizationName: alert.organization.name,
    siteName: alert.site?.name ?? "Unassigned",
    deviceName: alert.device?.name ?? null,
    createdAt: alert.createdAt.toISOString(),
    href: `/alerts/${alert.id}`,
    siteHref: alert.site ? `/sites/${alert.site.id}` : null,
    projectHref:
      alert.site?.projectSites[0]?.projectInstallation.id
        ? `/projects/${alert.site.projectSites[0].projectInstallation.id}`
        : null
  };
}

function toMonitoringActivityRow(
  activity: MonitoringActivityRecord
): CommandMapMonitoringActivity {
  return {
    id: activity.id,
    status:
      activity.status === "HEALTHY"
        ? "healthy"
        : activity.status === "WARNING"
          ? "warning"
          : activity.status === "CRITICAL"
            ? "critical"
            : "unknown",
    checkedAt: activity.checkedAt.toISOString(),
    message: activity.message,
    deviceName: activity.device.name,
    siteName: activity.device.site.name,
    siteHref: `/sites/${activity.device.site.id}`,
    organizationName: activity.device.organization.name
  };
}

export async function getCommandMapSnapshot(
  user: TenantUser,
  filters: CommandMapFilters
): Promise<CommandMapSnapshot> {
  const siteWhere = buildScopedSitesWhere(user, filters);
  const [organizations, projects, countries, siteRecords] = await Promise.all([
    getOrganizationOptions(user),
    getProjectOptions(user, filters.organizationId || undefined),
    prisma.site.findMany({
      where: {
        ...buildScopedSitesWhere(user, {
          ...filters,
          country: ""
        }),
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
    }),
    prisma.site.findMany({
      where: siteWhere,
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
        city: true,
        country: true,
        latitude: true,
        longitude: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        projectSites: {
          ...(filters.projectInstallationId
            ? {
                where: {
                  projectInstallationId: filters.projectInstallationId
                }
              }
            : {}),
          select: {
            projectInstallation: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        devices: {
          ...(filters.projectInstallationId
            ? {
                where: buildScopedDevicesWhere(filters)
              }
            : {}),
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            healthChecks: {
              orderBy: {
                checkedAt: "desc"
              },
              take: 1,
              select: {
                status: true,
                checkedAt: true,
                message: true
              }
            }
          }
        }
      }
    })
  ]);

  if (siteRecords.length === 0) {
    return {
      title: "Global Command Map",
      subtitle:
        "Map-first operational visibility for client sites, projects, and infrastructure worldwide.",
      breadcrumbs: [
        {
          label: "Command Center",
          href: "/dashboard"
        },
        {
          label: "Command Map"
        }
      ],
      metrics: buildMetrics([]),
      activeFilters: buildActiveFilters({
        filters,
        organizationName:
          organizations.find((organization) => organization.id === filters.organizationId)?.name,
        projectName: projects.find((project) => project.id === filters.projectInstallationId)?.name
      }),
      filterOptions: {
        organizations: organizations.map((organization) => ({
          id: organization.id,
          label: organization.name
        })),
        projects: projects.map((project) => ({
          id: project.id,
          label: project.name
        })),
        countries: countries
          .map((country) => country.country)
          .filter((country): country is string => Boolean(country))
          .map((country) => ({
            id: country,
            label: country
          }))
      },
      selectedFilters: filters,
      map: {
        center: [23, 9],
        zoom: 2,
        sites: [],
        mappedSiteCount: 0
      },
      panel: {
        criticalSites: [],
        recentAlerts: [],
        topProjects: [],
        offlineSites: [],
        recentMonitoring: []
      }
    };
  }

  const siteIds = siteRecords.map((site) => site.id);
  const activeAlerts = await prisma.alert.findMany({
    where: buildScopedAlertsWhere(user, filters, siteIds),
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true,
      title: true,
      severity: true,
      status: true,
      createdAt: true,
      siteId: true,
      device: {
        select: {
          id: true,
          name: true,
          projectInstallationId: true
        }
      },
      site: {
        select: {
          id: true,
          name: true,
          projectSites: {
            select: {
              projectInstallation: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      },
      organization: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  const alertsBySiteId = activeAlerts.reduce<
    Map<
      string,
      {
        total: number;
        critical: number;
        severities: Set<AlertSeverity>;
      }
    >
  >((accumulator, alert) => {
    if (!alert.siteId) {
      return accumulator;
    }

    const current = accumulator.get(alert.siteId) ?? {
      total: 0,
      critical: 0,
      severities: new Set<AlertSeverity>()
    };

    current.total += 1;
    current.severities.add(alert.severity);

    if (alert.severity === AlertSeverity.CRITICAL) {
      current.critical += 1;
    }

    accumulator.set(alert.siteId, current);
    return accumulator;
  }, new Map());

  const parsedSeverityPresence = parseAlertSeverityPresence(
    filters.alertSeverityPresence
  );

  const derivedSites = siteRecords.map<CommandMapSiteRecord>((site) => {
    const lastCheckAt = site.devices.reduce<Date | null>((latest, device) => {
      const checkedAt = device.healthChecks[0]?.checkedAt ?? null;

      if (!checkedAt) {
        return latest;
      }

      if (!latest || checkedAt > latest) {
        return checkedAt;
      }

      return latest;
    }, null);
    const rollup = deriveSiteHealthRollupFromStatusCounts(
      toSiteStatusCounts(site.devices),
      lastCheckAt
    );
    const latestHealth = getLatestHealthActivity(site.devices);
    const alertSummary = alertsBySiteId.get(site.id) ?? {
      total: 0,
      critical: 0,
      severities: new Set<AlertSeverity>()
    };
    const projectLinks = site.projectSites.map((projectSite) => ({
      id: projectSite.projectInstallation.id,
      name: projectSite.projectInstallation.name,
      href: `/projects/${projectSite.projectInstallation.id}`
    }));

    return {
      id: site.id,
      siteName: site.name,
      siteHref: `/sites/${site.id}`,
      organizationId: site.organizationId,
      organizationName: site.organization.name,
      organizationHref: `/organizations/${site.organization.id}`,
      city: site.city ?? "Unknown city",
      country: site.country ?? "Unknown country",
      coordinates:
        site.latitude !== null && site.longitude !== null
          ? [site.latitude, site.longitude]
          : null,
      health: deriveSiteHealth(rollup.health, alertSummary.total, alertSummary.critical),
      deviceCount: rollup.devicesCount,
      offlineDevices: rollup.offlineCount,
      activeAlerts: alertSummary.total,
      criticalAlerts: alertSummary.critical,
      alertSeverities: Array.from(alertSummary.severities).map((severity) =>
        severity.toLowerCase()
      ) as CommandMapSiteRecord["alertSeverities"],
      latestHealthAt: latestHealth?.checkedAt.toISOString() ?? null,
      latestHealthStatus: latestHealth?.status ?? rollup.health,
      latestHealthDeviceName: latestHealth?.deviceName ?? null,
      latestHealthMessage: latestHealth?.message ?? null,
      projectLinks,
      primaryProject: projectLinks[0] ?? null,
      deviceTypeCounts: getDeviceTypeCounts(site.devices)
    };
  });

  const filteredSites = derivedSites
    .filter((site) => hasRequiredHealthState(site, filters.healthState))
    .filter((site) => hasRequiredAlertPresence(site, parsedSeverityPresence))
    .filter((site) => hasRequiredOfflinePresence(site, filters.offlinePresence));

  const filteredSiteIds = filteredSites.map((site) => site.id);
  const recentAlerts = activeAlerts
    .filter((alert): alert is AlertRecord & { siteId: string } => Boolean(alert.siteId))
    .filter((alert) => filteredSiteIds.includes(alert.siteId))
    .filter((alert) => {
      if (!parsedSeverityPresence || parsedSeverityPresence === "ANY") {
        return true;
      }

      return alert.severity === parsedSeverityPresence;
    })
    .slice(0, 8)
    .map(toRecentAlertRow);

  const recentMonitoring = filteredSiteIds.length
    ? await prisma.healthCheck.findMany({
        where: {
          device: {
            is: {
              siteId: {
                in: filteredSiteIds
              },
              ...getScopedRecordWhere(user),
              ...buildScopedDevicesWhere(filters)
            }
          }
        },
        orderBy: {
          checkedAt: "desc"
        },
        take: 10,
        select: {
          id: true,
          status: true,
          checkedAt: true,
          message: true,
          device: {
            select: {
              id: true,
              name: true,
              siteId: true,
              site: {
                select: {
                  id: true,
                  name: true
                }
              },
              organization: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      })
    : [];

  const criticalSites = filteredSites
    .filter((site) => site.health === "critical")
    .sort((left, right) => {
      if (right.activeAlerts !== left.activeAlerts) {
        return right.activeAlerts - left.activeAlerts;
      }

      return right.offlineDevices - left.offlineDevices;
    })
    .slice(0, 8)
    .map(buildIssueSite);

  const offlineSites = filteredSites
    .filter((site) => site.offlineDevices > 0)
    .sort((left, right) => {
      if (right.offlineDevices !== left.offlineDevices) {
        return right.offlineDevices - left.offlineDevices;
      }

      return right.activeAlerts - left.activeAlerts;
    })
    .slice(0, 8)
    .map(buildIssueSite);

  const topProjectsMap = filteredSites.reduce<
    Map<
      string,
      {
        id: string;
        name: string;
        href: string;
        organizationName: string;
        siteIds: Set<string>;
        activeAlerts: number;
        offlineDevices: number;
        health: StatusTone;
      }
    >
  >((accumulator, site) => {
    if (site.projectLinks.length === 0) {
      return accumulator;
    }

    if (site.activeAlerts === 0 && site.offlineDevices === 0) {
      return accumulator;
    }

    for (const project of site.projectLinks) {
      const current = accumulator.get(project.id) ?? {
        id: project.id,
        name: project.name,
        href: project.href,
        organizationName: site.organizationName,
        siteIds: new Set<string>(),
        activeAlerts: 0,
        offlineDevices: 0,
        health: site.health
      };

      current.siteIds.add(site.id);
      current.activeAlerts += site.activeAlerts;
      current.offlineDevices += site.offlineDevices;

      if (tonePriority(site.health) < tonePriority(current.health)) {
        current.health = site.health;
      }

      accumulator.set(project.id, current);
    }

    return accumulator;
  }, new Map());

  const topProjects = Array.from(topProjectsMap.values())
    .map((project) => ({
      id: project.id,
      name: project.name,
      href: project.href,
      organizationName: project.organizationName,
      siteCount: project.siteIds.size,
      activeAlerts: project.activeAlerts,
      offlineDevices: project.offlineDevices,
      issueScore: project.activeAlerts + project.offlineDevices,
      health: project.health
    }))
    .sort((left, right) => {
      if (right.issueScore !== left.issueScore) {
        return right.issueScore - left.issueScore;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, 6);

  const organizationName = organizations.find(
    (organization) => organization.id === filters.organizationId
  )?.name;
  const projectName = projects.find(
    (project) => project.id === filters.projectInstallationId
  )?.name;
  const mappedCoordinates = filteredSites
    .map((site) => site.coordinates)
    .filter((coordinates): coordinates is [number, number] => Boolean(coordinates));

  return {
    title: "Global Command Map",
    subtitle:
      "Map-first operational visibility for client sites, projects, and infrastructure worldwide.",
    breadcrumbs: [
      {
        label: "Command Center",
        href: "/dashboard"
      },
      {
        label: "Command Map"
      }
    ],
    metrics: buildMetrics(filteredSites),
    activeFilters: buildActiveFilters({
      filters,
      organizationName,
      projectName
    }),
    filterOptions: {
      organizations: organizations.map((organization) => ({
        id: organization.id,
        label: organization.name
      })),
      projects: projects.map((project) => ({
        id: project.id,
        label: project.name
      })),
      countries: countries
        .map((country) => country.country)
        .filter((country): country is string => Boolean(country))
        .map((country) => ({
          id: country,
          label: country
        }))
    },
    selectedFilters: filters,
    map: {
      center: buildMapCenter(mappedCoordinates, [23, 9]),
      zoom: buildMapZoom(mappedCoordinates.length),
      sites: filteredSites,
      mappedSiteCount: mappedCoordinates.length
    },
    panel: {
      criticalSites,
      recentAlerts,
      topProjects,
      offlineSites,
      recentMonitoring: recentMonitoring.map(toMonitoringActivityRow)
    }
  };
}

export function parseCommandMapFilters(
  values: Record<string, string | string[] | undefined>
): CommandMapFilters {
  const coerce = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] ?? "" : value ?? "";

  const healthState = coerce(values.healthState);
  const alertSeverityPresence = coerce(values.alertSeverityPresence);
  const offlinePresence = coerce(values.offlinePresence);

  return {
    organizationId: coerce(values.organizationId),
    projectInstallationId: coerce(values.projectInstallationId),
    country: coerce(values.country),
    healthState: commandMapHealthStates.includes(
      healthState as CommandMapHealthState
    )
      ? (healthState as CommandMapHealthState)
      : "",
    alertSeverityPresence: commandMapAlertSeverityPresenceOptions.includes(
      alertSeverityPresence as (typeof commandMapAlertSeverityPresenceOptions)[number]
    )
      ? (alertSeverityPresence as CommandMapFilters["alertSeverityPresence"])
      : "",
    offlinePresence: commandMapOfflinePresenceOptions.includes(
      offlinePresence as (typeof commandMapOfflinePresenceOptions)[number]
    )
      ? (offlinePresence as CommandMapFilters["offlinePresence"])
      : ""
  };
}
