import {
  AlertSeverity,
  AlertStatus,
  DeviceStatus,
  DeviceType,
  MonitoringMode,
  Prisma,
  ProjectInstallationStatus,
  ProjectType
} from "@prisma/client";

import type { StatusTone } from "@/lib/dashboard/types";
import { prisma } from "@/lib/db";
import { deriveSiteHealthRollupFromStatusCounts } from "@/lib/management/health";
import {
  MANAGEMENT_PAGE_SIZE,
  getOrganizationOptions
} from "@/lib/management/organizations";
import { getSiteOptions } from "@/lib/management/sites";
import {
  getScopedRecordWhere,
  type TenantUser
} from "@/lib/management/tenant";

export type ProjectListFilters = {
  query: string;
  organizationId: string;
  status: ProjectInstallationStatus | "";
  projectType: ProjectType | "";
  page: number;
};

export type ProjectOption = {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  status: ProjectInstallationStatus;
};

type DeviceStatusCount = {
  status: DeviceStatus;
  _count: {
    _all: number;
  };
};

type ProjectReadinessItem = {
  key: string;
  label: string;
  description: string;
  status: "ready" | "warning" | "missing" | "not_applicable";
  tone: StatusTone;
  value: string;
  blocking: boolean;
};

function buildDeviceStatusCounts(
  statuses: DeviceStatus[]
): DeviceStatusCount[] {
  const counts = statuses.reduce<Map<DeviceStatus, number>>((accumulator, status) => {
    accumulator.set(status, (accumulator.get(status) ?? 0) + 1);
    return accumulator;
  }, new Map());

  return Array.from(counts.entries()).map(([status, count]) => ({
    status,
    _count: {
      _all: count
    }
  }));
}

function formatRatioValue(current: number, total: number) {
  return `${current} / ${total}`;
}

function buildReadinessItem(input: {
  key: string;
  label: string;
  description: string;
  status: ProjectReadinessItem["status"];
  value: string;
  blocking?: boolean;
}): ProjectReadinessItem {
  switch (input.status) {
    case "ready":
      return {
        ...input,
        tone: "healthy",
        blocking: false
      };
    case "warning":
      return {
        ...input,
        tone: "warning",
        blocking: false
      };
    case "missing":
      return {
        ...input,
        tone: input.blocking ? "critical" : "warning",
        blocking: input.blocking ?? false
      };
    case "not_applicable":
      return {
        ...input,
        tone: "info",
        blocking: false
      };
  }
}

function buildProjectsWhere(
  user: TenantUser,
  filters: ProjectListFilters
): Prisma.ProjectInstallationWhereInput {
  const search = filters.query.trim();

  return {
    AND: [
      getScopedRecordWhere(user),
      filters.organizationId
        ? {
            organizationId: filters.organizationId
          }
        : {},
      filters.status
        ? {
            status: filters.status
          }
        : {},
      filters.projectType
        ? {
            projectType: filters.projectType
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
                projectCode: {
                  contains: search
                }
              },
              {
                clientContactName: {
                  contains: search
                }
              },
              {
                internalProjectManager: {
                  contains: search
                }
              },
              {
                leadTechnician: {
                  contains: search
                }
              },
              {
                externalReference: {
                  contains: search
                }
              }
            ]
          }
        : {}
    ]
  };
}

export async function getProjectOptions(
  user: TenantUser,
  organizationId?: string | null
) {
  const projects = await prisma.projectInstallation.findMany({
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
      status: true,
      organization: {
        select: {
          name: true
        }
      }
    }
  });

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    organizationId: project.organizationId,
    organizationName: project.organization.name,
    status: project.status
  }));
}

export async function getProjectFormOptions(user: TenantUser) {
  const [organizations, sites] = await Promise.all([
    getOrganizationOptions(user),
    getSiteOptions(user)
  ]);

  return {
    organizations,
    sites
  };
}

export async function getProjectsList(
  user: TenantUser,
  filters: ProjectListFilters
) {
  const where = buildProjectsWhere(user, filters);
  const skip = (filters.page - 1) * MANAGEMENT_PAGE_SIZE;

  const [totalCount, projects, organizations] = await Promise.all([
    prisma.projectInstallation.count({ where }),
    prisma.projectInstallation.findMany({
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
        projectCode: true,
        status: true,
        projectType: true,
        priority: true,
        monitoringReady: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        primarySite: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            projectSites: true,
            devices: true,
            accessReferences: true
          }
        }
      }
    }),
    getOrganizationOptions(user)
  ]);

  return {
    projects,
    organizations,
    totalCount,
    pageSize: MANAGEMENT_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(totalCount / MANAGEMENT_PAGE_SIZE))
  };
}

function buildProjectReadinessSummary(input: {
  linkedSitesCount: number;
  linkedDevicesCount: number;
  coreDevicesCount: number;
  networkSegmentsCount: number;
  accessReferencesCount: number;
  totalNvrs: number;
  totalCameras: number;
  nvrChannelAssignmentsCount: number;
  deviceLinksCount: number;
  monitoringReadyDevicesCount: number;
  healthChecksCount: number;
  activeCriticalAlertsCount: number;
  monitoringReadyFlag: boolean;
}) {
  const monitoringCoverage =
    input.linkedDevicesCount > 0
      ? input.monitoringReadyDevicesCount / input.linkedDevicesCount
      : 0;
  const requiresNvrMappings = input.totalNvrs > 0 && input.totalCameras > 0;
  const requiresDeviceLinks =
    input.linkedDevicesCount > 1 && input.coreDevicesCount > 0;

  const items: ProjectReadinessItem[] = [
    buildReadinessItem({
      key: "linked-sites",
      label: "Linked sites",
      description: "At least one persistent deployment site is attached to the project record.",
      status: input.linkedSitesCount > 0 ? "ready" : "missing",
      value: `${input.linkedSitesCount} linked`,
      blocking: true
    }),
    buildReadinessItem({
      key: "core-devices",
      label: "Core infrastructure",
      description: "Routers, switches, or NVRs exist so the installation can be operated and supported.",
      status: input.coreDevicesCount > 0 ? "ready" : "missing",
      value: `${input.coreDevicesCount} core assets`,
      blocking: true
    }),
    buildReadinessItem({
      key: "network-segments",
      label: "Network segments",
      description: "Management and camera VLANs or subnets are documented for the linked sites.",
      status: input.networkSegmentsCount > 0 ? "ready" : "missing",
      value: `${input.networkSegmentsCount} recorded`,
      blocking: input.linkedSitesCount > 0
    }),
    buildReadinessItem({
      key: "access-references",
      label: "Secure access references",
      description: "Vault paths or remote-access notes exist without storing plaintext credentials.",
      status: input.accessReferencesCount > 0 ? "ready" : "missing",
      value: `${input.accessReferencesCount} references`,
      blocking: false
    }),
    buildReadinessItem({
      key: "nvr-mapping",
      label: "NVR and camera mapping",
      description: "Recorder channels are mapped to cameras wherever recording infrastructure exists.",
      status: !requiresNvrMappings
        ? "not_applicable"
        : input.nvrChannelAssignmentsCount >= input.totalCameras
          ? "ready"
          : input.nvrChannelAssignmentsCount > 0
            ? "warning"
            : "missing",
      value: requiresNvrMappings
        ? formatRatioValue(input.nvrChannelAssignmentsCount, input.totalCameras)
        : "Not required",
      blocking: requiresNvrMappings
    }),
    buildReadinessItem({
      key: "device-links",
      label: "Infrastructure links",
      description: "Routers, switches, cameras, and APs have explicit topology relationships recorded.",
      status: !requiresDeviceLinks
        ? "not_applicable"
        : input.deviceLinksCount > 0
          ? "ready"
          : "missing",
      value: requiresDeviceLinks ? `${input.deviceLinksCount} links` : "Not required",
      blocking: false
    }),
    buildReadinessItem({
      key: "monitoring-coverage",
      label: "Monitoring coverage",
      description: "Devices are assigned to active or passive monitoring instead of remaining manual-only.",
      status:
        input.linkedDevicesCount === 0
          ? "missing"
          : monitoringCoverage >= 0.85
            ? "ready"
            : monitoringCoverage > 0
              ? "warning"
              : "missing",
      value:
        input.linkedDevicesCount > 0
          ? `${Math.round(monitoringCoverage * 100)}% coverage`
          : "No linked devices",
      blocking: input.linkedDevicesCount > 0
    }),
    buildReadinessItem({
      key: "telemetry-history",
      label: "Health telemetry",
      description: "Recent health checks exist so the project is visible in dashboards and incident review.",
      status: input.healthChecksCount > 0 ? "ready" : "warning",
      value: `${input.healthChecksCount} checks`,
      blocking: false
    }),
    buildReadinessItem({
      key: "critical-alerts",
      label: "Critical blockers",
      description: "No active critical alerts are currently blocking handoff or support readiness.",
      status:
        input.activeCriticalAlertsCount === 0
          ? "ready"
          : "warning",
      value:
        input.activeCriticalAlertsCount === 0
          ? "No active critical alerts"
          : `${input.activeCriticalAlertsCount} active critical alerts`,
      blocking: false
    }),
    buildReadinessItem({
      key: "project-flag",
      label: "Project monitoring flag",
      description: "The project-level monitoring flag has been enabled for operational handoff.",
      status: input.monitoringReadyFlag ? "ready" : "warning",
      value: input.monitoringReadyFlag ? "Marked ready" : "Pending project sign-off",
      blocking: false
    })
  ];

  const applicableItems = items.filter((item) => item.status !== "not_applicable");
  const readyCount = applicableItems.filter((item) => item.status === "ready").length;
  const blockers = items.filter((item) => item.blocking && item.status !== "ready");
  const warnings = items.filter((item) => item.status === "warning");
  const score =
    applicableItems.length > 0
      ? Math.round((readyCount / applicableItems.length) * 100)
      : 0;

  let tone: StatusTone = "healthy";
  let label = "Operationally ready";
  let summary =
    "This installation has the core data, monitoring coverage, and access context expected for ongoing operations.";

  if (blockers.length > 0) {
    tone = "critical";
    label = "Commissioning blocked";
    summary =
      "Required onboarding records are still missing before this project can be treated as fully commissioned.";
  } else if (warnings.length > 0 || score < 100) {
    tone = "warning";
    label = "Commissioning in progress";
    summary =
      "The project is visible in the command center, but some operational documentation or monitoring coverage still needs completion.";
  }

  return {
    score,
    tone,
    label,
    summary,
    completedCount: readyCount,
    applicableCount: applicableItems.length,
    blockers,
    warnings,
    items
  };
}

export async function getProjectDetail(user: TenantUser, id: string) {
  const project = await prisma.projectInstallation.findFirst({
    where: {
      id,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true,
      primarySiteId: true,
      name: true,
      projectCode: true,
      status: true,
      projectType: true,
      priority: true,
      installationDate: true,
      goLiveDate: true,
      warrantyStartAt: true,
      warrantyEndAt: true,
      clientContactName: true,
      clientContactEmail: true,
      clientContactPhone: true,
      internalProjectManager: true,
      leadTechnician: true,
      salesOwner: true,
      scopeSummary: true,
      remoteAccessMethod: true,
      handoffStatus: true,
      monitoringReady: true,
      vendorSystemsPlanned: true,
      externalReference: true,
      internalNotes: true,
      clientFacingNotes: true,
      createdAt: true,
      updatedAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      primarySite: {
        select: {
          id: true,
          name: true,
          city: true,
          country: true
        }
      },
      projectSites: {
        orderBy: {
          site: {
            name: "asc"
          }
        },
        select: {
          id: true,
          roleOrPhase: true,
          notes: true,
          createdAt: true,
          site: {
            select: {
              id: true,
              name: true,
              city: true,
              country: true,
              status: true,
              devices: {
                where: {
                  projectInstallationId: id
                },
                select: {
                  id: true,
                  type: true,
                  status: true,
                  monitoringMode: true,
                  healthChecks: {
                    orderBy: {
                      checkedAt: "desc"
                    },
                    take: 1,
                    select: {
                      checkedAt: true
                    }
                  }
                }
              }
            }
          }
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
          hostname: true,
          ipAddress: true,
          firmwareVersion: true,
          monitoringMode: true,
          lastSeenAt: true,
          site: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      _count: {
        select: {
          projectSites: true,
          devices: true,
          accessReferences: true
        }
      }
    }
  });

  if (!project) {
    return null;
  }

  const linkedSiteIds = project.projectSites.map((projectSite) => projectSite.site.id);
  const activeAlertsWhere: Prisma.AlertWhereInput = {
    organizationId: project.organizationId,
    status: {
      in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED]
    },
    OR: [
      {
        device: {
          is: {
            projectInstallationId: project.id
          }
        }
      },
      ...(linkedSiteIds.length > 0
        ? [
            {
              siteId: {
                in: linkedSiteIds
              }
            }
          ]
        : [])
    ]
  };

  const [
    deviceStatuses,
    deviceTypes,
    monitoringReadyDevicesCount,
    activeAlertsCount,
    activeCriticalAlertsCount,
    openAlertsCount,
    acknowledgedAlertsCount,
    healthChecksCount,
    latestMonitoringActivity,
    networkSegments,
    accessReferences,
    nvrChannelAssignments,
    deviceLinks,
    siteAlertCounts
  ] = await Promise.all([
    prisma.device.groupBy({
      by: ["status"],
      where: {
        organizationId: project.organizationId,
        projectInstallationId: project.id
      },
      _count: {
        _all: true
      }
    }),
    prisma.device.groupBy({
      by: ["type"],
      where: {
        organizationId: project.organizationId,
        projectInstallationId: project.id
      },
      _count: {
        _all: true
      }
    }),
    prisma.device.count({
      where: {
        organizationId: project.organizationId,
        projectInstallationId: project.id,
        monitoringMode: {
          not: MonitoringMode.MANUAL
        }
      }
    }),
    prisma.alert.count({
      where: activeAlertsWhere
    }),
    prisma.alert.count({
      where: {
        ...activeAlertsWhere,
        severity: AlertSeverity.CRITICAL
      }
    }),
    prisma.alert.count({
      where: {
        ...activeAlertsWhere,
        status: AlertStatus.OPEN
      }
    }),
    prisma.alert.count({
      where: {
        ...activeAlertsWhere,
        status: AlertStatus.ACKNOWLEDGED
      }
    }),
    prisma.healthCheck.count({
      where: {
        device: {
          is: {
            organizationId: project.organizationId,
            projectInstallationId: project.id
          }
        }
      }
    }),
    prisma.healthCheck.findFirst({
      where: {
        device: {
          is: {
            organizationId: project.organizationId,
            projectInstallationId: project.id
          }
        }
      },
      orderBy: {
        checkedAt: "desc"
      },
      select: {
        checkedAt: true
      }
    }),
    linkedSiteIds.length > 0
      ? prisma.networkSegment.findMany({
          where: {
            organizationId: project.organizationId,
            siteId: {
              in: linkedSiteIds
            }
          },
          orderBy: [
            {
              site: {
                name: "asc"
              }
            },
            {
              vlanId: "asc"
            },
            {
              name: "asc"
            }
          ],
          select: {
            id: true,
            name: true,
            vlanId: true,
            subnetCidr: true,
            gatewayIp: true,
            purpose: true,
            notes: true,
            site: {
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
        })
      : Promise.resolve([]),
    prisma.accessReference.findMany({
      where: {
        organizationId: project.organizationId,
        OR: [
          {
            projectInstallationId: project.id
          },
          ...(linkedSiteIds.length > 0
            ? [
                {
                  siteId: {
                    in: linkedSiteIds
                  }
                }
              ]
            : []),
          {
            device: {
              is: {
                projectInstallationId: project.id
              }
            }
          }
        ]
      },
      orderBy: [
        {
          name: "asc"
        }
      ],
      select: {
        id: true,
        siteId: true,
        projectInstallationId: true,
        deviceId: true,
        name: true,
        accessType: true,
        vaultProvider: true,
        vaultPath: true,
        owner: true,
        remoteAccessMethod: true,
        lastValidatedAt: true,
        notes: true,
        site: {
          select: {
            id: true,
            name: true
          }
        },
        device: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    }),
    prisma.nvrChannelAssignment.findMany({
      where: {
        organizationId: project.organizationId,
        OR: [
          {
            nvrDevice: {
              is: {
                projectInstallationId: project.id
              }
            }
          },
          {
            cameraDevice: {
              is: {
                projectInstallationId: project.id
              }
            }
          }
        ]
      },
      orderBy: [
        {
          nvrDevice: {
            name: "asc"
          }
        },
        {
          channelNumber: "asc"
        }
      ],
        select: {
          id: true,
          channelNumber: true,
          recordingEnabled: true,
          notes: true,
          site: {
            select: {
              id: true,
              name: true,
              city: true,
              country: true
            }
          },
          nvrDevice: {
            select: {
              id: true,
              name: true
            }
        },
        cameraDevice: {
          select: {
            id: true,
            name: true,
            site: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    }),
    prisma.deviceLink.findMany({
      where: {
        organizationId: project.organizationId,
        OR: [
          {
            sourceDevice: {
              is: {
                projectInstallationId: project.id
              }
            }
          },
          {
            targetDevice: {
              is: {
                projectInstallationId: project.id
              }
            }
          }
        ]
      },
      orderBy: [
        {
          sourceDevice: {
            name: "asc"
          }
        },
        {
          targetDevice: {
            name: "asc"
          }
        }
      ],
        select: {
          id: true,
          linkType: true,
          sourcePort: true,
          targetPort: true,
          poeProvided: true,
          notes: true,
          site: {
            select: {
              id: true,
              name: true,
              city: true,
              country: true
            }
          },
          sourceDevice: {
            select: {
              id: true,
              name: true,
              type: true
          }
        },
        targetDevice: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    }),
    linkedSiteIds.length > 0
      ? prisma.alert.groupBy({
          by: ["siteId"],
          where: {
            organizationId: project.organizationId,
            siteId: {
              in: linkedSiteIds
            },
            status: {
              in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED]
            }
          },
          _count: {
            _all: true
          }
        })
      : Promise.resolve([])
  ]);

  const getDeviceTypeCount = (type: DeviceType) =>
    deviceTypes.find((entry) => entry.type === type)?._count._all ?? 0;

  const siteAlertCountMap = new Map(
    siteAlertCounts.map((entry) => [entry.siteId, entry._count._all])
  );

  const totalAccessPoints = getDeviceTypeCount(DeviceType.ACCESS_POINT);
  const totalOtherDevices =
    getDeviceTypeCount(DeviceType.ACCESS_CONTROL) +
    getDeviceTypeCount(DeviceType.SENSOR) +
    getDeviceTypeCount(DeviceType.SERVER) +
    getDeviceTypeCount(DeviceType.OTHER);
  const totalDevices = project._count.devices;
  const totalRouters = getDeviceTypeCount(DeviceType.ROUTER);
  const totalSwitches = getDeviceTypeCount(DeviceType.SWITCH);
  const totalNvrs = getDeviceTypeCount(DeviceType.NVR);
  const totalCameras = getDeviceTypeCount(DeviceType.CAMERA);
  const healthyDevices = buildDeviceStatusCounts(
    project.projectSites.flatMap((projectSite) =>
      projectSite.site.devices.map((device) => device.status)
    )
  );
  const linkedSites = project.projectSites.map((projectSite) => {
    const siteStatuses = buildDeviceStatusCounts(
      projectSite.site.devices.map((device) => device.status)
    );
    const lastCheckAt = projectSite.site.devices.reduce<Date | null>(
      (latest, device) => {
        const checkedAt = device.healthChecks[0]?.checkedAt ?? null;

        if (!checkedAt) {
          return latest;
        }

        if (!latest || checkedAt > latest) {
          return checkedAt;
        }

        return latest;
      },
      null
    );
    const monitoringReadyCount = projectSite.site.devices.filter(
      (device) => device.monitoringMode !== MonitoringMode.MANUAL
    ).length;
    const cameraCount = projectSite.site.devices.filter(
      (device) => device.type === DeviceType.CAMERA
    ).length;

    return {
      ...projectSite,
      site: {
        ...projectSite.site,
        deviceCount: projectSite.site.devices.length,
        monitoringReadyCount,
        cameraCount,
        activeAlertsCount: siteAlertCountMap.get(projectSite.site.id) ?? 0,
        healthSummary: deriveSiteHealthRollupFromStatusCounts(
          siteStatuses,
          lastCheckAt
        )
      }
    };
  });
  const infrastructureSummary = [
    {
      key: "routers",
      label: "Routers",
      count: totalRouters,
      description: "WAN edge and primary gateway equipment.",
      tone: "info" as StatusTone
    },
    {
      key: "switches",
      label: "Switches",
      count: totalSwitches,
      description: "Core, distribution, and PoE switching in scope.",
      tone: "healthy" as StatusTone
    },
    {
      key: "nvrs",
      label: "NVRs",
      count: totalNvrs,
      description: "Recorder nodes handling video retention and review.",
      tone: "info" as StatusTone
    },
    {
      key: "cameras",
      label: "Cameras",
      count: totalCameras,
      description: "Field surveillance endpoints installed for this project.",
      tone: "healthy" as StatusTone
    },
    {
      key: "access-points",
      label: "Access points",
      count: totalAccessPoints,
      description: "Wireless infrastructure supporting site connectivity.",
      tone: "info" as StatusTone
    },
    {
      key: "other",
      label: "Other devices",
      count: totalOtherDevices,
      description: "Access control, sensors, servers, and additional assets.",
      tone: "unknown" as StatusTone
    }
  ];
  const readiness = buildProjectReadinessSummary({
    linkedSitesCount: project._count.projectSites,
    linkedDevicesCount: totalDevices,
    coreDevicesCount: totalRouters + totalSwitches + totalNvrs,
    networkSegmentsCount: networkSegments.length,
    accessReferencesCount: accessReferences.length,
    totalNvrs,
    totalCameras,
    nvrChannelAssignmentsCount: nvrChannelAssignments.length,
    deviceLinksCount: deviceLinks.length,
    monitoringReadyDevicesCount,
    healthChecksCount,
    activeCriticalAlertsCount,
    monitoringReadyFlag: project.monitoringReady
  });

  return {
    ...project,
    projectSites: linkedSites,
    accessReferences,
    deviceStatuses,
    siteDeviceStatuses: healthyDevices,
    monitoringReadyDevicesCount,
    activeAlertsCount,
    activeCriticalAlertsCount,
    openAlertsCount,
    acknowledgedAlertsCount,
    healthChecksCount,
    latestMonitoringActivityAt: latestMonitoringActivity?.checkedAt ?? null,
    totalCameras,
    totalNvrs,
    totalSwitches,
    totalRouters,
    totalAccessPoints,
    totalOtherDevices,
    networkSegments,
    nvrChannelAssignments,
    deviceLinks,
    infrastructureSummary,
    accessReferencesCount: accessReferences.length,
    readiness
  };
}

export async function getProjectForEdit(user: TenantUser, id: string) {
  return prisma.projectInstallation.findFirst({
    where: {
      id,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true,
      primarySiteId: true,
      name: true,
      projectCode: true,
      status: true,
      projectType: true,
      priority: true,
      installationDate: true,
      goLiveDate: true,
      warrantyStartAt: true,
      warrantyEndAt: true,
      clientContactName: true,
      clientContactEmail: true,
      clientContactPhone: true,
      internalProjectManager: true,
      leadTechnician: true,
      salesOwner: true,
      scopeSummary: true,
      remoteAccessMethod: true,
      handoffStatus: true,
      monitoringReady: true,
      vendorSystemsPlanned: true,
      externalReference: true,
      internalNotes: true,
      clientFacingNotes: true,
      projectSites: {
        select: {
          siteId: true
        }
      }
    }
  });
}
