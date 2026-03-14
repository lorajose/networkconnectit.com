import {
  AlertStatus,
  DeviceLinkType,
  DeviceStatus,
  DeviceType,
  MonitoringMode,
  Prisma
} from "@prisma/client";

import type { StatusTone } from "@/lib/dashboard/types";
import { prisma } from "@/lib/db";
import type { TenantUser } from "@/lib/management/tenant";
import { getScopedRecordWhere } from "@/lib/management/tenant";
import {
  deviceLinkTypeTone,
  deviceStatusTone,
  monitoringModeTone
} from "@/lib/status";
import { formatLocation } from "@/lib/utils";

type TopologyScope = "site" | "project";
type TopologyLayerKey =
  | "gateway"
  | "switching"
  | "recording"
  | "edge"
  | "wireless"
  | "other";

type DeviceSummaryRecord = {
  id: string;
  name: string;
  type: DeviceType;
  brand: string | null;
  model: string | null;
  hostname: string | null;
  ipAddress: string | null;
  status: DeviceStatus;
  monitoringMode: MonitoringMode;
  site: {
    id: string;
    name: string;
    city: string | null;
    country: string | null;
  };
  projectInstallation: {
    id: string;
    name: string;
  } | null;
  healthChecks: Array<{
    status: Prisma.HealthCheckGetPayload<{
      select: { status: true };
    }>["status"];
    checkedAt: Date;
    message: string | null;
  }>;
  alerts: Array<{
    id: string;
    severity: Prisma.AlertGetPayload<{
      select: { severity: true };
    }>["severity"];
  }>;
};

export type TopologyDeviceRecord = {
  id: string;
  name: string;
  href: string;
  type: DeviceType;
  brand: string | null;
  model: string | null;
  hostname: string | null;
  ipAddress: string | null;
  siteId: string;
  siteName: string;
  siteHref: string;
  siteLocation: string;
  projectId: string | null;
  projectName: string | null;
  projectHref: string | null;
  status: DeviceStatus;
  statusTone: StatusTone;
  monitoringMode: MonitoringMode;
  monitoringTone: StatusTone;
  activeAlerts: number;
  criticalAlerts: number;
  latestHealthAt: string | null;
  latestHealthMessage: string | null;
  latestHealthTone: StatusTone;
  linkCount: number;
};

export type TopologyLinkRecord = {
  id: string;
  siteId: string;
  siteName: string;
  siteHref: string;
  sourceDevice: TopologyDeviceRecord;
  targetDevice: TopologyDeviceRecord;
  linkType: DeviceLinkType;
  linkTone: StatusTone;
  sourcePort: string | null;
  targetPort: string | null;
  poeProvided: boolean | null;
  notes: string | null;
};

export type TopologyAssignmentRecord = {
  id: string;
  channelNumber: number;
  recordingEnabled: boolean;
  notes: string | null;
  camera: TopologyDeviceRecord;
};

export type TopologyNvrGroup = {
  nvr: TopologyDeviceRecord;
  assignments: TopologyAssignmentRecord[];
};

export type TopologyLayer = {
  key: TopologyLayerKey;
  title: string;
  description: string;
  devices: TopologyDeviceRecord[];
};

export type TopologySnapshot = {
  scope: TopologyScope;
  id: string;
  name: string;
  title: string;
  subtitle: string;
  organization: {
    id: string;
    name: string;
    href: string;
  };
  site: {
    id: string;
    name: string;
    href: string;
    location: string;
  } | null;
  project: {
    id: string;
    name: string;
    href: string;
  } | null;
  breadcrumbs: Array<{
    label: string;
    href?: string;
  }>;
  summary: {
    routers: number;
    switches: number;
    nvrs: number;
    cameras: number;
    accessPoints: number;
    otherDevices: number;
    totalDevices: number;
    activeAlerts: number;
    offlineDevices: number;
    linkedDevices: number;
    unlinkedDevices: number;
    assignedCameras: number;
    unassignedCameras: number;
    readinessScore: number;
    readinessTone: StatusTone;
    readinessLabel: string;
    primaryGateway: TopologyDeviceRecord | null;
  };
  layers: TopologyLayer[];
  links: TopologyLinkRecord[];
  nvrGroups: TopologyNvrGroup[];
  unlinkedDevices: TopologyDeviceRecord[];
  unassignedCameras: TopologyDeviceRecord[];
  warnings: Array<{
    id: string;
    tone: StatusTone;
    title: string;
    description: string;
  }>;
};

const activeAlertStatuses = [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] as const;
const primaryTopologyDeviceTypes = new Set<DeviceType>([
  DeviceType.ROUTER,
  DeviceType.SWITCH,
  DeviceType.NVR,
  DeviceType.CAMERA,
  DeviceType.ACCESS_POINT
]);

const layerMetadata: Record<
  TopologyLayerKey,
  { title: string; description: string }
> = {
  gateway: {
    title: "WAN / Gateway Layer",
    description: "Primary router and edge gateway devices carrying upstream connectivity."
  },
  switching: {
    title: "Switching Layer",
    description: "Core and edge switches distributing connectivity and PoE."
  },
  recording: {
    title: "Recording Layer",
    description: "Recorders and video retention systems supporting surveillance workloads."
  },
  edge: {
    title: "Camera / Edge Layer",
    description: "Cameras and field-edge devices installed at the site or within the project."
  },
  wireless: {
    title: "Wireless Layer",
    description: "Access points and wireless infrastructure supporting the deployment."
  },
  other: {
    title: "Other Infrastructure",
    description: "Servers, access control, sensors, and other supporting devices."
  }
};

function getDeviceLayerKey(deviceType: DeviceType): TopologyLayerKey {
  switch (deviceType) {
    case DeviceType.ROUTER:
      return "gateway";
    case DeviceType.SWITCH:
      return "switching";
    case DeviceType.NVR:
      return "recording";
    case DeviceType.CAMERA:
      return "edge";
    case DeviceType.ACCESS_POINT:
      return "wireless";
    default:
      return "other";
  }
}

function tonePriority(tone: StatusTone) {
  switch (tone) {
    case "critical":
      return 0;
    case "warning":
      return 1;
    case "info":
      return 2;
    case "unknown":
      return 3;
    case "healthy":
      return 4;
  }
}

function buildDeviceRecord(device: DeviceSummaryRecord): TopologyDeviceRecord {
  const latestHealth = device.healthChecks[0];
  const baseTone = deviceStatusTone(device.status);
  const latestHealthTone = latestHealth
    ? latestHealth.status === "HEALTHY"
      ? "healthy"
      : latestHealth.status === "WARNING"
        ? "warning"
        : latestHealth.status === "CRITICAL"
          ? "critical"
          : "unknown"
    : baseTone;
  const criticalAlerts = device.alerts.filter(
    (alert) => alert.severity === "CRITICAL"
  ).length;
  const statusTone =
    criticalAlerts > 0
      ? "critical"
      : tonePriority(latestHealthTone) < tonePriority(baseTone)
        ? latestHealthTone
        : baseTone;

  return {
    id: device.id,
    name: device.name,
    href: `/devices/${device.id}`,
    type: device.type,
    brand: device.brand,
    model: device.model,
    hostname: device.hostname,
    ipAddress: device.ipAddress,
    siteId: device.site.id,
    siteName: device.site.name,
    siteHref: `/sites/${device.site.id}`,
    siteLocation: formatLocation([device.site.city, device.site.country]),
    projectId: device.projectInstallation?.id ?? null,
    projectName: device.projectInstallation?.name ?? null,
    projectHref: device.projectInstallation
      ? `/projects/${device.projectInstallation.id}`
      : null,
    status: device.status,
    statusTone,
    monitoringMode: device.monitoringMode,
    monitoringTone: monitoringModeTone(device.monitoringMode),
    activeAlerts: device.alerts.length,
    criticalAlerts,
    latestHealthAt: latestHealth?.checkedAt.toISOString() ?? null,
    latestHealthMessage: latestHealth?.message ?? null,
    latestHealthTone,
    linkCount: 0
  };
}

function buildLayerDevices(devices: TopologyDeviceRecord[]) {
  return (Object.keys(layerMetadata) as TopologyLayerKey[]).map((key) => ({
    key,
    title: layerMetadata[key].title,
    description: layerMetadata[key].description,
    devices: devices.filter((device) => getDeviceLayerKey(device.type) === key)
  }));
}

function inferPrimaryGateway(
  routers: TopologyDeviceRecord[],
  links: TopologyLinkRecord[]
) {
  if (routers.length === 0) {
    return null;
  }

  if (routers.length === 1) {
    return routers[0];
  }

  return [...routers]
    .sort((left, right) => {
      const leftConnections = links.filter(
        (link) => link.sourceDevice.id === left.id || link.targetDevice.id === left.id
      ).length;
      const rightConnections = links.filter(
        (link) => link.sourceDevice.id === right.id || link.targetDevice.id === right.id
      ).length;

      if (rightConnections !== leftConnections) {
        return rightConnections - leftConnections;
      }

      if (tonePriority(left.statusTone) !== tonePriority(right.statusTone)) {
        return tonePriority(left.statusTone) - tonePriority(right.statusTone);
      }

      return left.name.localeCompare(right.name);
    })[0];
}

function buildWarnings(input: {
  scope: TopologyScope;
  routers: number;
  switches: number;
  nvrs: number;
  cameras: number;
  deviceCount: number;
  linksCount: number;
  unlinkedDevicesCount: number;
  unassignedCamerasCount: number;
  offlineDevices: number;
  activeAlerts: number;
}) {
  const warnings: TopologySnapshot["warnings"] = [];

  if (input.routers === 0) {
    warnings.push({
      id: "missing-router",
      tone: "warning",
      title: "No router/gateway registered",
      description:
        "Add at least one gateway device so WAN health and upstream topology can be understood."
    });
  }

  if (input.switches === 0 && input.deviceCount > 2) {
    warnings.push({
      id: "missing-switch",
      tone: "warning",
      title: "No switching layer registered",
      description:
        "This deployment has multiple devices but no registered switch infrastructure."
    });
  }

  if (input.cameras > 0 && input.nvrs === 0) {
    warnings.push({
      id: "missing-nvr",
      tone: "warning",
      title: "Cameras exist without an NVR",
      description:
        "Add recording infrastructure or confirm this deployment uses camera-direct retention."
    });
  }

  if (input.linksCount === 0 && input.deviceCount > 1) {
    warnings.push({
      id: "missing-links",
      tone: "warning",
      title: "No device relationships mapped",
      description:
        "Capture uplinks and downstream relationships to make troubleshooting and handoff easier."
    });
  }

  if (input.unlinkedDevicesCount > 0) {
    warnings.push({
      id: "unlinked-devices",
      tone: "info",
      title: `${input.unlinkedDevicesCount} unlinked devices`,
      description:
        "Some devices exist in inventory but are not represented in the topology relationships yet."
    });
  }

  if (input.unassignedCamerasCount > 0) {
    warnings.push({
      id: "unassigned-cameras",
      tone: "warning",
      title: `${input.unassignedCamerasCount} cameras without NVR mapping`,
      description:
        "Review NVR channel assignments so recording coverage can be verified during support or handoff."
    });
  }

  if (input.offlineDevices > 0 || input.activeAlerts > 0) {
    warnings.push({
      id: "active-issues",
      tone:
        input.offlineDevices > 0 || input.activeAlerts > 2 ? "critical" : "warning",
      title: "Active operational issues detected",
      description:
        "Offline devices and open alerts are reflected directly in the topology summary for faster troubleshooting."
    });
  }

  if (warnings.length === 0) {
    warnings.push({
      id: "topology-healthy",
      tone: "healthy",
      title: "Topology coverage looks healthy",
      description:
        "Core infrastructure, device relationships, and recording assignments are represented cleanly for this scope."
    });
  }

  return warnings;
}

function buildReadinessSummary(input: {
  deviceCount: number;
  linkedDeviceCount: number;
  camerasCount: number;
  assignedCameraCount: number;
  alertsCount: number;
  offlineDevicesCount: number;
}) {
  const topologyCoverage =
    input.deviceCount > 0 ? input.linkedDeviceCount / input.deviceCount : 0;
  const cameraCoverage =
    input.camerasCount > 0 ? input.assignedCameraCount / input.camerasCount : 1;
  const score = Math.round(((topologyCoverage + cameraCoverage) / 2) * 100);

  if (input.offlineDevicesCount > 0 || input.alertsCount > 3) {
    return {
      score,
      tone: "critical" as StatusTone,
      label: "Issues impacting topology health"
    };
  }

  if (score < 100) {
    return {
      score,
      tone: "warning" as StatusTone,
      label: "Topology mapping in progress"
    };
  }

  return {
    score,
    tone: "healthy" as StatusTone,
    label: "Topology coverage ready"
  };
}

function buildLinkRecord(
  link: Prisma.DeviceLinkGetPayload<{
    select: {
      id: true;
      linkType: true;
      sourcePort: true;
      targetPort: true;
      poeProvided: true;
      notes: true;
      site: {
        select: {
          id: true;
          name: true;
        };
      };
      sourceDevice: {
        select: {
          id: true;
        };
      };
      targetDevice: {
        select: {
          id: true;
        };
      };
    };
  }>,
  devicesById: Map<string, TopologyDeviceRecord>
): TopologyLinkRecord | null {
  const sourceDevice = devicesById.get(link.sourceDevice.id);
  const targetDevice = devicesById.get(link.targetDevice.id);

  if (!sourceDevice || !targetDevice) {
    return null;
  }

  return {
    id: link.id,
    siteId: link.site.id,
    siteName: link.site.name,
    siteHref: `/sites/${link.site.id}`,
    sourceDevice,
    targetDevice,
    linkType: link.linkType,
    linkTone: deviceLinkTypeTone(link.linkType),
    sourcePort: link.sourcePort,
    targetPort: link.targetPort,
    poeProvided: link.poeProvided,
    notes: link.notes
  };
}

function groupAssignmentsByNvr(
  assignments: Array<
    Prisma.NvrChannelAssignmentGetPayload<{
      select: {
        id: true;
        channelNumber: true;
        recordingEnabled: true;
        notes: true;
        nvrDevice: {
          select: {
            id: true;
          };
        };
        cameraDevice: {
          select: {
            id: true;
          };
        };
      };
    }>
  >,
  devicesById: Map<string, TopologyDeviceRecord>
) {
  const groups = new Map<string, TopologyNvrGroup>();

  for (const assignment of assignments) {
    const nvr = devicesById.get(assignment.nvrDevice.id);
    const camera = devicesById.get(assignment.cameraDevice.id);

    if (!nvr || !camera) {
      continue;
    }

    const currentGroup = groups.get(nvr.id) ?? {
      nvr,
      assignments: []
    };

    currentGroup.assignments.push({
      id: assignment.id,
      channelNumber: assignment.channelNumber,
      recordingEnabled: assignment.recordingEnabled,
      notes: assignment.notes,
      camera
    });
    groups.set(nvr.id, currentGroup);
  }

  return Array.from(groups.values()).sort((left, right) =>
    left.nvr.name.localeCompare(right.nvr.name)
  );
}

async function getScopedDeviceRecords(where: Prisma.DeviceWhereInput) {
  const devices = await prisma.device.findMany({
    where,
    orderBy: [
      {
        type: "asc"
      },
      {
        name: "asc"
      }
    ],
    select: {
      id: true,
      name: true,
      type: true,
      brand: true,
      model: true,
      hostname: true,
      ipAddress: true,
      status: true,
      monitoringMode: true,
      site: {
        select: {
          id: true,
          name: true,
          city: true,
          country: true
        }
      },
      projectInstallation: {
        select: {
          id: true,
          name: true
        }
      },
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
      },
      alerts: {
        where: {
          status: {
            in: [...activeAlertStatuses]
          }
        },
        select: {
          id: true,
          severity: true
        }
      }
    }
  });

  return devices.map(buildDeviceRecord);
}

export async function getSiteTopologySnapshot(user: TenantUser, siteId: string) {
  const site = await prisma.site.findFirst({
    where: {
      id: siteId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      name: true,
      city: true,
      country: true,
      organizationId: true,
      organization: {
        select: {
          id: true,
          name: true
        }
      },
      projectSites: {
        orderBy: {
          projectInstallation: {
            name: "asc"
          }
        },
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
  });

  if (!site) {
    return null;
  }

  const [devices, linksRaw, assignmentsRaw, activeAlertsCount] = await Promise.all([
    getScopedDeviceRecords({
      siteId: site.id,
      ...getScopedRecordWhere(user)
    }),
    prisma.deviceLink.findMany({
      where: {
        siteId: site.id,
        organizationId: site.organizationId
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
            name: true
          }
        },
        sourceDevice: {
          select: {
            id: true
          }
        },
        targetDevice: {
          select: {
            id: true
          }
        }
      }
    }),
    prisma.nvrChannelAssignment.findMany({
      where: {
        siteId: site.id,
        organizationId: site.organizationId
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
        nvrDevice: {
          select: {
            id: true
          }
        },
        cameraDevice: {
          select: {
            id: true
          }
        }
      }
    }),
    prisma.alert.count({
      where: {
        siteId: site.id,
        organizationId: site.organizationId,
        status: {
          in: [...activeAlertStatuses]
        }
      }
    })
  ]);

  return buildTopologySnapshot({
    scope: "site",
    id: site.id,
    name: site.name,
    organization: {
      id: site.organization.id,
      name: site.organization.name,
      href: `/organizations/${site.organization.id}`
    },
    site: {
      id: site.id,
      name: site.name,
      href: `/sites/${site.id}`,
      location: formatLocation([site.city, site.country])
    },
    project: site.projectSites[0]
      ? {
          id: site.projectSites[0].projectInstallation.id,
          name: site.projectSites[0].projectInstallation.name,
          href: `/projects/${site.projectSites[0].projectInstallation.id}`
        }
      : null,
    breadcrumbs: [
      {
        label: "Command Center",
        href: "/dashboard"
      },
      {
        label: "Sites",
        href: "/sites"
      },
      {
        label: site.name,
        href: `/sites/${site.id}`
      },
      {
        label: "Topology"
      }
    ],
    devices,
    linksRaw,
    assignmentsRaw,
    activeAlertsCount
  });
}

export async function getProjectTopologySnapshot(
  user: TenantUser,
  projectId: string
) {
  const project = await prisma.projectInstallation.findFirst({
    where: {
      id: projectId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      name: true,
      organizationId: true,
      organization: {
        select: {
          id: true,
          name: true
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
        select: {
          site: {
            select: {
              id: true
            }
          }
        }
      }
    }
  });

  if (!project) {
    return null;
  }

  const linkedSiteIds = project.projectSites.map((entry) => entry.site.id);
  const [devices, linksRaw, assignmentsRaw, activeAlertsCount] = await Promise.all([
    getScopedDeviceRecords({
      organizationId: project.organizationId,
      projectInstallationId: project.id
    }),
    prisma.deviceLink.findMany({
      where: {
        organizationId: project.organizationId,
        ...(linkedSiteIds.length > 0
          ? {
              siteId: {
                in: linkedSiteIds
              }
            }
          : {}),
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
          site: {
            name: "asc"
          }
        },
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
            name: true
          }
        },
        sourceDevice: {
          select: {
            id: true
          }
        },
        targetDevice: {
          select: {
            id: true
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
          site: {
            name: "asc"
          }
        },
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
        nvrDevice: {
          select: {
            id: true
          }
        },
        cameraDevice: {
          select: {
            id: true
          }
        }
      }
    }),
    prisma.alert.count({
      where: {
        organizationId: project.organizationId,
        status: {
          in: [...activeAlertStatuses]
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
      }
    })
  ]);

  return buildTopologySnapshot({
    scope: "project",
    id: project.id,
    name: project.name,
    organization: {
      id: project.organization.id,
      name: project.organization.name,
      href: `/organizations/${project.organization.id}`
    },
    site: project.primarySite
      ? {
          id: project.primarySite.id,
          name: project.primarySite.name,
          href: `/sites/${project.primarySite.id}`,
          location: formatLocation([
            project.primarySite.city,
            project.primarySite.country
          ])
        }
      : null,
    project: {
      id: project.id,
      name: project.name,
      href: `/projects/${project.id}`
    },
    breadcrumbs: [
      {
        label: "Command Center",
        href: "/dashboard"
      },
      {
        label: "Projects",
        href: "/projects"
      },
      {
        label: project.name,
        href: `/projects/${project.id}`
      },
      {
        label: "Topology"
      }
    ],
    devices,
    linksRaw,
    assignmentsRaw,
    activeAlertsCount
  });
}

function buildTopologySnapshot(input: {
  scope: TopologyScope;
  id: string;
  name: string;
  organization: TopologySnapshot["organization"];
  site: TopologySnapshot["site"];
  project: TopologySnapshot["project"];
  breadcrumbs: TopologySnapshot["breadcrumbs"];
  devices: TopologyDeviceRecord[];
  linksRaw: Array<
    Prisma.DeviceLinkGetPayload<{
      select: {
        id: true;
        linkType: true;
        sourcePort: true;
        targetPort: true;
        poeProvided: true;
        notes: true;
        site: {
          select: {
            id: true;
            name: true;
          };
        };
        sourceDevice: {
          select: {
            id: true;
          };
        };
        targetDevice: {
          select: {
            id: true;
          };
        };
      };
    }>
  >;
  assignmentsRaw: Array<
    Prisma.NvrChannelAssignmentGetPayload<{
      select: {
        id: true;
        channelNumber: true;
        recordingEnabled: true;
        notes: true;
        nvrDevice: {
          select: {
            id: true;
          };
        };
        cameraDevice: {
          select: {
            id: true;
          };
        };
      };
    }>
  >;
  activeAlertsCount: number;
}): TopologySnapshot {
  const devicesById = new Map<string, TopologyDeviceRecord>(
    input.devices.map((device) => [device.id, { ...device }])
  );
  const links = input.linksRaw
    .map((link) => buildLinkRecord(link, devicesById))
    .filter((link): link is TopologyLinkRecord => Boolean(link));

  for (const link of links) {
    const source = devicesById.get(link.sourceDevice.id);
    const target = devicesById.get(link.targetDevice.id);

    if (source) {
      source.linkCount += 1;
    }

    if (target) {
      target.linkCount += 1;
    }
  }

  const devices = Array.from(devicesById.values());
  const routers = devices.filter((device) => device.type === DeviceType.ROUTER);
  const switches = devices.filter((device) => device.type === DeviceType.SWITCH);
  const nvrs = devices.filter((device) => device.type === DeviceType.NVR);
  const cameras = devices.filter((device) => device.type === DeviceType.CAMERA);
  const accessPoints = devices.filter(
    (device) => device.type === DeviceType.ACCESS_POINT
  );
  const otherDevices = devices.filter(
    (device) => !primaryTopologyDeviceTypes.has(device.type)
  );
  const nvrGroups = groupAssignmentsByNvr(input.assignmentsRaw, devicesById);
  const linkedDeviceIds = new Set(
    links.flatMap((link) => [link.sourceDevice.id, link.targetDevice.id])
  );
  const assignedCameraIds = new Set(
    nvrGroups.flatMap((group) => group.assignments.map((assignment) => assignment.camera.id))
  );
  const unlinkedDevices = devices
    .filter((device) => !linkedDeviceIds.has(device.id))
    .sort((left, right) => left.name.localeCompare(right.name));
  const unassignedCameras = cameras
    .filter((camera) => !assignedCameraIds.has(camera.id))
    .sort((left, right) => left.name.localeCompare(right.name));
  const offlineDevices = devices.filter((device) => device.status === DeviceStatus.OFFLINE).length;
  const primaryGateway = inferPrimaryGateway(routers, links);
  const readiness = buildReadinessSummary({
    deviceCount: devices.length,
    linkedDeviceCount: linkedDeviceIds.size,
    camerasCount: cameras.length,
    assignedCameraCount: assignedCameraIds.size,
    alertsCount: input.activeAlertsCount,
    offlineDevicesCount: offlineDevices
  });

  return {
    scope: input.scope,
    id: input.id,
    name: input.name,
    title:
      input.scope === "site"
        ? `${input.name} Topology Summary`
        : `${input.name} Installation Topology`,
    subtitle:
      input.scope === "site"
        ? "Layered infrastructure summary for field support, commissioning review, and technical troubleshooting."
        : "Project-scoped topology view for installation review, handoff validation, and operational troubleshooting.",
    organization: input.organization,
    site: input.site,
    project: input.project,
    breadcrumbs: input.breadcrumbs,
    summary: {
      routers: routers.length,
      switches: switches.length,
      nvrs: nvrs.length,
      cameras: cameras.length,
      accessPoints: accessPoints.length,
      otherDevices: otherDevices.length,
      totalDevices: devices.length,
      activeAlerts: input.activeAlertsCount,
      offlineDevices,
      linkedDevices: linkedDeviceIds.size,
      unlinkedDevices: unlinkedDevices.length,
      assignedCameras: assignedCameraIds.size,
      unassignedCameras: unassignedCameras.length,
      readinessScore: readiness.score,
      readinessTone: readiness.tone,
      readinessLabel: readiness.label,
      primaryGateway
    },
    layers: buildLayerDevices(devices),
    links,
    nvrGroups,
    unlinkedDevices,
    unassignedCameras,
    warnings: buildWarnings({
      scope: input.scope,
      routers: routers.length,
      switches: switches.length,
      nvrs: nvrs.length,
      cameras: cameras.length,
      deviceCount: devices.length,
      linksCount: links.length,
      unlinkedDevicesCount: unlinkedDevices.length,
      unassignedCamerasCount: unassignedCameras.length,
      offlineDevices,
      activeAlerts: input.activeAlertsCount
    })
  };
}
