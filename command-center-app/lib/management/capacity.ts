import {
  AlertStatus,
  DeviceLinkType,
  DeviceStatus,
  DeviceType,
  Prisma
} from "@prisma/client";

import type { StatusTone } from "@/lib/dashboard/types";
import { prisma } from "@/lib/db";
import type { TenantUser } from "@/lib/management/tenant";
import { getScopedRecordWhere } from "@/lib/management/tenant";
import { deviceStatusTone } from "@/lib/status";
import { formatLocation } from "@/lib/utils";

type CapacityScope = "site" | "project";

type DeviceSummaryRecord = {
  id: string;
  name: string;
  type: DeviceType;
  brand: string | null;
  model: string | null;
  hostname: string | null;
  ipAddress: string | null;
  switchRole: string | null;
  portCount: number | null;
  usedPortCount: number | null;
  poeBudgetWatts: number | null;
  poeUsedWatts: number | null;
  poeRequired: boolean | null;
  estimatedPoeWatts: number | null;
  status: DeviceStatus;
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
  alerts: Array<{
    severity: Prisma.AlertGetPayload<{
      select: { severity: true };
    }>["severity"];
  }>;
};

type LinkSummaryRecord = Prisma.DeviceLinkGetPayload<{
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
}>;

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

function escalateTone(current: StatusTone, next: StatusTone) {
  return tonePriority(next) < tonePriority(current) ? next : current;
}

const activeAlertStatuses = [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] as const;
const likelyPoeDeviceTypes = new Set<DeviceType>([
  DeviceType.CAMERA,
  DeviceType.ACCESS_POINT,
  DeviceType.ACCESS_CONTROL
]);

export type CapacityDeviceRecord = {
  id: string;
  name: string;
  href: string;
  type: DeviceType;
  brand: string | null;
  model: string | null;
  hostname: string | null;
  ipAddress: string | null;
  switchRole: string | null;
  portCount: number | null;
  usedPortCount: number | null;
  poeBudgetWatts: number | null;
  poeUsedWatts: number | null;
  poeRequired: boolean | null;
  estimatedPoeWatts: number | null;
  siteId: string;
  siteName: string;
  siteHref: string;
  siteLocation: string;
  projectId: string | null;
  projectName: string | null;
  projectHref: string | null;
  status: DeviceStatus;
  statusTone: StatusTone;
  activeAlerts: number;
  criticalAlerts: number;
};

export type CapacityDownstreamDeviceRecord = {
  linkId: string;
  linkType: DeviceLinkType;
  sourcePort: string | null;
  targetPort: string | null;
  poeProvided: boolean | null;
  device: CapacityDeviceRecord;
  estimatedWatts: number | null;
  isPoeCandidate: boolean;
};

export type CapacitySwitchWarning = {
  id: string;
  tone: StatusTone;
  label: string;
};

export type CapacitySwitchRecord = {
  switch: CapacityDeviceRecord;
  isPoeCapable: boolean;
  downstreamDevices: CapacityDownstreamDeviceRecord[];
  mappedPoeDevicesCount: number;
  unknownWattsDevicesCount: number;
  effectiveLoadWatts: number | null;
  loadSource: "measured" | "derived" | "unknown";
  remainingHeadroomWatts: number | null;
  portCapacity: number | null;
  usedPorts: number | null;
  freePorts: number | null;
  loadPct: number | null;
  portPct: number | null;
  tone: StatusTone;
  warnings: CapacitySwitchWarning[];
};

export type CapacityIssueRecord = {
  id: string;
  tone: StatusTone;
  title: string;
  description: string;
  href?: string;
};

export type CapacitySnapshot = {
  scope: CapacityScope;
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
    totalSites: number;
    totalSwitches: number;
    poeCapableSwitches: number;
    totalEstimatedLoadWatts: number;
    totalDefinedBudgetWatts: number;
    switchesMissingBudget: number;
    switchesNearCapacity: number;
    switchesOverCapacity: number;
    switchesRequiringReview: number;
    devicesMissingPoeSourceMapping: number;
    devicesMissingEstimatedWatts: number;
    mappedPoeDevices: number;
    totalPorts: number;
    usedPorts: number;
    freePorts: number;
    tone: StatusTone;
    label: string;
  };
  switches: CapacitySwitchRecord[];
  unmappedPoeDevices: CapacityDeviceRecord[];
  devicesMissingEstimatedWatts: CapacityDeviceRecord[];
  issues: CapacityIssueRecord[];
};

function buildDeviceRecord(device: DeviceSummaryRecord): CapacityDeviceRecord {
  const criticalAlerts = device.alerts.filter(
    (alert) => alert.severity === "CRITICAL"
  ).length;
  let statusTone = deviceStatusTone(device.status);

  if (criticalAlerts > 0) {
    statusTone = "critical";
  } else if (device.alerts.length > 0) {
    statusTone = escalateTone(statusTone, "warning");
  }

  return {
    id: device.id,
    name: device.name,
    href: `/devices/${device.id}`,
    type: device.type,
    brand: device.brand,
    model: device.model,
    hostname: device.hostname,
    ipAddress: device.ipAddress,
    switchRole: device.switchRole,
    portCount: device.portCount,
    usedPortCount: device.usedPortCount,
    poeBudgetWatts: device.poeBudgetWatts,
    poeUsedWatts: device.poeUsedWatts,
    poeRequired: device.poeRequired,
    estimatedPoeWatts: device.estimatedPoeWatts,
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
    activeAlerts: device.alerts.length,
    criticalAlerts
  };
}

function isLikelyPoePowered(device: CapacityDeviceRecord) {
  return (
    device.poeRequired === true ||
    device.estimatedPoeWatts !== null ||
    likelyPoeDeviceTypes.has(device.type)
  );
}

function buildCapacityTone(input: {
  switchDevice: CapacityDeviceRecord;
  warnings: CapacitySwitchWarning[];
}) {
  let tone = input.switchDevice.statusTone;

  for (const warning of input.warnings) {
    tone = escalateTone(tone, warning.tone);
  }

  return tone;
}

function getDistinctUsedPorts(
  device: CapacityDeviceRecord,
  links: LinkSummaryRecord[]
) {
  const ports = new Set<string>();

  for (const link of links) {
    if (link.sourceDevice.id === device.id && link.sourcePort) {
      ports.add(`source:${link.sourcePort}`);
    }

    if (link.targetDevice.id === device.id && link.targetPort) {
      ports.add(`target:${link.targetPort}`);
    }
  }

  if (ports.size > 0) {
    return ports.size;
  }

  return links.length > 0 ? links.length : null;
}

function buildDownstreamDeviceMap(
  switchDevice: CapacityDeviceRecord,
  switchLinks: LinkSummaryRecord[],
  devicesById: Map<string, CapacityDeviceRecord>
) {
  const downstreamByDeviceId = new Map<string, CapacityDownstreamDeviceRecord>();

  for (const link of switchLinks) {
    if (link.sourceDevice.id !== switchDevice.id) {
      continue;
    }

    const targetDevice = devicesById.get(link.targetDevice.id);

    if (!targetDevice) {
      continue;
    }

    const isPoeCandidate =
      link.poeProvided === true || isLikelyPoePowered(targetDevice);

    if (!isPoeCandidate) {
      continue;
    }

    const current = downstreamByDeviceId.get(targetDevice.id);
    const candidate: CapacityDownstreamDeviceRecord = {
      linkId: link.id,
      linkType: link.linkType,
      sourcePort: link.sourcePort,
      targetPort: link.targetPort,
      poeProvided: link.poeProvided,
      device: targetDevice,
      estimatedWatts: targetDevice.estimatedPoeWatts,
      isPoeCandidate
    };

    if (
      !current ||
      current.poeProvided !== true && candidate.poeProvided === true ||
      current.linkType !== DeviceLinkType.POE_SUPPLY &&
        candidate.linkType === DeviceLinkType.POE_SUPPLY
    ) {
      downstreamByDeviceId.set(targetDevice.id, candidate);
    }
  }

  return Array.from(downstreamByDeviceId.values()).sort((left, right) =>
    left.device.name.localeCompare(right.device.name)
  );
}

function buildScopeSummaryTone(input: {
  totalSwitches: number;
  switchesOverCapacity: number;
  switchesNearCapacity: number;
  switchesRequiringReview: number;
  devicesMissingPoeSourceMapping: number;
}) {
  if (input.totalSwitches === 0) {
    return {
      tone: "warning" as StatusTone,
      label: "Switch inventory missing"
    };
  }

  if (
    input.switchesOverCapacity > 0 ||
    input.devicesMissingPoeSourceMapping > 0
  ) {
    return {
      tone: "critical" as StatusTone,
      label: "Critical capacity blockers"
    };
  }

  if (input.switchesNearCapacity > 0 || input.switchesRequiringReview > 0) {
    return {
      tone: "warning" as StatusTone,
      label: "Capacity review needed"
    };
  }

  return {
    tone: "healthy" as StatusTone,
    label: "Capacity coverage healthy"
  };
}

async function getScopedDevices(where: Prisma.DeviceWhereInput) {
  const devices = await prisma.device.findMany({
    where,
    orderBy: [
      {
        site: {
          name: "asc"
        }
      },
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
      switchRole: true,
      portCount: true,
      usedPortCount: true,
      poeBudgetWatts: true,
      poeUsedWatts: true,
      poeRequired: true,
      estimatedPoeWatts: true,
      status: true,
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
      alerts: {
        where: {
          status: {
            in: [...activeAlertStatuses]
          }
        },
        select: {
          severity: true
        }
      }
    }
  });

  return devices.map(buildDeviceRecord);
}

function buildCapacitySnapshot(input: {
  scope: CapacityScope;
  id: string;
  name: string;
  organization: CapacitySnapshot["organization"];
  site: CapacitySnapshot["site"];
  project: CapacitySnapshot["project"];
  breadcrumbs: CapacitySnapshot["breadcrumbs"];
  devices: CapacityDeviceRecord[];
  linksRaw: LinkSummaryRecord[];
  totalSites: number;
}) {
  const devicesById = new Map<string, CapacityDeviceRecord>(
    input.devices.map((device) => [device.id, device])
  );

  const switches = input.devices.filter((device) => device.type === DeviceType.SWITCH);
  const poeCandidateDevices = input.devices.filter(
    (device) => device.type !== DeviceType.SWITCH && isLikelyPoePowered(device)
  );

  const switchRecords: CapacitySwitchRecord[] = switches.map((switchDevice) => {
    const relatedLinks = input.linksRaw.filter(
      (link) =>
        link.sourceDevice.id === switchDevice.id || link.targetDevice.id === switchDevice.id
    );
    const downstreamDevices = buildDownstreamDeviceMap(
      switchDevice,
      relatedLinks,
      devicesById
    );
    const mappedPoeDevicesCount = downstreamDevices.length;
    const unknownWattsDevicesCount = downstreamDevices.filter(
      (entry) => entry.estimatedWatts === null
    ).length;
    const derivedLoadWatts =
      downstreamDevices.length === 0
        ? 0
        : downstreamDevices.every((entry) => entry.estimatedWatts === null)
          ? null
          : downstreamDevices.reduce(
              (total, entry) => total + (entry.estimatedWatts ?? 0),
              0
            );
    const effectiveLoadWatts =
      switchDevice.poeUsedWatts ?? derivedLoadWatts ?? null;
    const loadSource =
      switchDevice.poeUsedWatts !== null
        ? "measured"
        : derivedLoadWatts !== null
          ? "derived"
          : "unknown";
    const usedPorts =
      switchDevice.usedPortCount ?? getDistinctUsedPorts(switchDevice, relatedLinks);
    const portCapacity = switchDevice.portCount ?? null;
    const freePorts =
      portCapacity !== null && usedPorts !== null
        ? Math.max(portCapacity - usedPorts, 0)
        : null;
    const loadPct =
      switchDevice.poeBudgetWatts !== null && effectiveLoadWatts !== null
        ? (effectiveLoadWatts / switchDevice.poeBudgetWatts) * 100
        : null;
    const portPct =
      portCapacity !== null && usedPorts !== null
        ? (usedPorts / portCapacity) * 100
        : null;
    const warnings: CapacitySwitchWarning[] = [];

    if (mappedPoeDevicesCount > 0 && switchDevice.poeBudgetWatts === null) {
      warnings.push({
        id: `${switchDevice.id}-budget-missing`,
        tone: "warning",
        label: "PoE budget missing"
      });
    }

    if (loadPct !== null && loadPct > 100) {
      warnings.push({
        id: `${switchDevice.id}-overload`,
        tone: "critical",
        label: "PoE capacity exceeded"
      });
    } else if (loadPct !== null && loadPct >= 80) {
      warnings.push({
        id: `${switchDevice.id}-near-capacity`,
        tone: "warning",
        label: "PoE headroom low"
      });
    }

    if (portPct !== null && portPct > 100) {
      warnings.push({
        id: `${switchDevice.id}-ports-over`,
        tone: "critical",
        label: "Port capacity exceeded"
      });
    } else if (portPct !== null && portPct >= 80) {
      warnings.push({
        id: `${switchDevice.id}-ports-near`,
        tone: "warning",
        label: "Port utilization high"
      });
    }

    if (
      mappedPoeDevicesCount > 0 &&
      switchDevice.poeUsedWatts === null &&
      unknownWattsDevicesCount > 0
    ) {
      warnings.push({
        id: `${switchDevice.id}-unknown-device-load`,
        tone: "info",
        label: "Downstream watt estimates missing"
      });
    }

    if (switchDevice.activeAlerts > 0 && switchDevice.criticalAlerts === 0) {
      warnings.push({
        id: `${switchDevice.id}-active-alerts`,
        tone: "warning",
        label: "Active alerts on switch"
      });
    }

    if (switchDevice.criticalAlerts > 0) {
      warnings.push({
        id: `${switchDevice.id}-critical-alerts`,
        tone: "critical",
        label: "Critical alerts on switch"
      });
    }

    const tone = buildCapacityTone({
      switchDevice,
      warnings
    });

    return {
      switch: switchDevice,
      isPoeCapable:
        switchDevice.poeBudgetWatts !== null ||
        switchDevice.poeUsedWatts !== null ||
        mappedPoeDevicesCount > 0,
      downstreamDevices,
      mappedPoeDevicesCount,
      unknownWattsDevicesCount,
      effectiveLoadWatts,
      loadSource,
      remainingHeadroomWatts:
        switchDevice.poeBudgetWatts !== null && effectiveLoadWatts !== null
          ? switchDevice.poeBudgetWatts - effectiveLoadWatts
          : null,
      portCapacity,
      usedPorts,
      freePorts,
      loadPct,
      portPct,
      tone,
      warnings
    };
  });

  const mappedPoeDeviceIds = new Set(
    switchRecords.flatMap((record) =>
      record.downstreamDevices.map((entry) => entry.device.id)
    )
  );
  const unmappedPoeDevices = poeCandidateDevices.filter(
    (device) => !mappedPoeDeviceIds.has(device.id)
  );
  const devicesMissingEstimatedWatts = poeCandidateDevices.filter(
    (device) => device.estimatedPoeWatts === null
  );

  const issues: CapacityIssueRecord[] = [];

  if (switchRecords.length === 0) {
    issues.push({
      id: `${input.scope}-${input.id}-no-switches`,
      tone: "warning",
      title: "No switches registered in this scope",
      description:
        "Add at least one switching device to evaluate PoE supply, downstream coverage, and port headroom."
    });
  }

  for (const record of switchRecords) {
    for (const warning of record.warnings) {
      issues.push({
        id: warning.id,
        tone: warning.tone,
        title: `${record.switch.name}: ${warning.label}`,
        description:
          warning.label === "PoE budget missing"
            ? "Define the switch PoE budget so headroom and upgrade risk can be evaluated."
            : warning.label === "PoE capacity exceeded"
              ? "Estimated or measured PoE draw is above the configured budget."
              : warning.label === "PoE headroom low"
                ? "Estimated load is above the 80% warning threshold."
                : warning.label === "Port capacity exceeded"
                  ? "Used ports exceed the configured switch port capacity."
                  : warning.label === "Port utilization high"
                    ? "Used ports are above the 80% warning threshold."
                    : warning.label === "Downstream watt estimates missing"
                      ? "One or more mapped PoE devices do not have estimated wattage recorded."
                      : "The switch currently has active alerts that may affect capacity confidence.",
        href: record.switch.href
      });
    }
  }

  for (const device of unmappedPoeDevices) {
    issues.push({
      id: `unmapped-${device.id}`,
      tone: "warning",
      title: `${device.name}: PoE source not mapped`,
      description:
        "This device looks PoE-powered but is not linked to any upstream switch in the current scope.",
      href: device.href
    });
  }

  for (const device of devicesMissingEstimatedWatts) {
    issues.push({
      id: `watts-missing-${device.id}`,
      tone: "info",
      title: `${device.name}: Estimated PoE draw missing`,
      description:
        "Capture estimated PoE wattage so switch load and upgrade headroom can be evaluated accurately.",
      href: device.href
    });
  }

  const switchesMissingBudget = switchRecords.filter(
    (record) => record.switch.poeBudgetWatts === null
  ).length;
  const switchesNearCapacity = switchRecords.filter(
    (record) =>
      record.loadPct !== null &&
      record.loadPct >= 80 &&
      record.loadPct <= 100
  ).length;
  const switchesOverCapacity = switchRecords.filter(
    (record) =>
      (record.loadPct !== null && record.loadPct > 100) ||
      (record.portPct !== null && record.portPct > 100)
  ).length;
  const switchesRequiringReview = switchRecords.filter(
    (record) => record.warnings.length > 0
  ).length;
  const totalEstimatedLoadWatts = switchRecords.reduce(
    (total, record) => total + (record.effectiveLoadWatts ?? 0),
    0
  );
  const totalDefinedBudgetWatts = switchRecords.reduce(
    (total, record) => total + (record.switch.poeBudgetWatts ?? 0),
    0
  );
  const totalPorts = switchRecords.reduce(
    (total, record) => total + (record.portCapacity ?? 0),
    0
  );
  const usedPorts = switchRecords.reduce(
    (total, record) => total + (record.usedPorts ?? 0),
    0
  );
  const freePorts = switchRecords.reduce(
    (total, record) => total + (record.freePorts ?? 0),
    0
  );
  const summaryTone = buildScopeSummaryTone({
    totalSwitches: switchRecords.length,
    switchesOverCapacity,
    switchesNearCapacity,
    switchesRequiringReview,
    devicesMissingPoeSourceMapping: unmappedPoeDevices.length
  });

  return {
    scope: input.scope,
    id: input.id,
    name: input.name,
    title:
      input.scope === "site"
        ? `${input.name} Capacity Summary`
        : `${input.name} Infrastructure Capacity`,
    subtitle:
      input.scope === "site"
        ? "Switch load, PoE headroom, and downstream device power coverage for this site."
        : "Project-scoped switch capacity, mapped PoE demand, and infrastructure review signals.",
    organization: input.organization,
    site: input.site,
    project: input.project,
    breadcrumbs: input.breadcrumbs,
    summary: {
      totalSites: input.totalSites,
      totalSwitches: switchRecords.length,
      poeCapableSwitches: switchRecords.filter((record) => record.isPoeCapable).length,
      totalEstimatedLoadWatts,
      totalDefinedBudgetWatts,
      switchesMissingBudget,
      switchesNearCapacity,
      switchesOverCapacity,
      switchesRequiringReview,
      devicesMissingPoeSourceMapping: unmappedPoeDevices.length,
      devicesMissingEstimatedWatts: devicesMissingEstimatedWatts.length,
      mappedPoeDevices: mappedPoeDeviceIds.size,
      totalPorts,
      usedPorts,
      freePorts,
      tone: summaryTone.tone,
      label: summaryTone.label
    },
    switches: switchRecords.sort((left, right) => {
      if (tonePriority(left.tone) !== tonePriority(right.tone)) {
        return tonePriority(left.tone) - tonePriority(right.tone);
      }

      if (left.switch.siteName !== right.switch.siteName) {
        return left.switch.siteName.localeCompare(right.switch.siteName);
      }

      return left.switch.name.localeCompare(right.switch.name);
    }),
    unmappedPoeDevices: unmappedPoeDevices.sort((left, right) =>
      left.name.localeCompare(right.name)
    ),
    devicesMissingEstimatedWatts: devicesMissingEstimatedWatts.sort((left, right) =>
      left.name.localeCompare(right.name)
    ),
    issues
  };
}

export async function getSiteCapacitySnapshot(user: TenantUser, siteId: string) {
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

  const [devices, linksRaw] = await Promise.all([
    getScopedDevices({
      siteId: site.id,
      ...getScopedRecordWhere(user)
    }),
    prisma.deviceLink.findMany({
      where: {
        siteId: site.id,
        organizationId: site.organization.id
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
    })
  ]);

  return buildCapacitySnapshot({
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
        label: "Capacity"
      }
    ],
    devices,
    linksRaw,
    totalSites: 1
  });
}

export async function getProjectCapacitySnapshot(
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
  const [devices, linksRaw] = await Promise.all([
    getScopedDevices({
      organizationId: project.organizationId,
      projectInstallationId: project.id,
      ...getScopedRecordWhere(user)
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
    })
  ]);

  return buildCapacitySnapshot({
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
          location: formatLocation([project.primarySite.city, project.primarySite.country])
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
        label: "Capacity"
      }
    ],
    devices,
    linksRaw,
    totalSites: linkedSiteIds.length
  });
}
