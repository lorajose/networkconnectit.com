import {
  AlertSeverity,
  AlertStatus,
  MonitoringMode
} from "@prisma/client";

import type { StatusTone } from "@/lib/dashboard/types";
import { prisma } from "@/lib/db";
import { getRecentAlertsForScope } from "@/lib/management/alerts";
import type { CapacitySnapshot } from "@/lib/management/capacity";
import {
  getProjectCapacitySnapshot,
  getSiteCapacitySnapshot
} from "@/lib/management/capacity";
import {
  getProjectHealthTimeline,
  getSiteHealthTimeline,
  type HealthTimelineEntry
} from "@/lib/management/health";
import { getSiteInfrastructureDetail } from "@/lib/management/infrastructure";
import {
  getProjectDetail
} from "@/lib/management/projects";
import { getSiteDetail } from "@/lib/management/sites";
import {
  getScopedRecordWhere,
  type TenantUser
} from "@/lib/management/tenant";
import {
  getProjectTopologySnapshot,
  getSiteTopologySnapshot,
  type TopologySnapshot
} from "@/lib/management/topology";
import { formatLocation } from "@/lib/utils";

type ProjectDetailRecord = NonNullable<Awaited<ReturnType<typeof getProjectDetail>>>;
type SiteDetailRecord = NonNullable<Awaited<ReturnType<typeof getSiteDetail>>>;
type SiteInfrastructureRecord = NonNullable<
  Awaited<ReturnType<typeof getSiteInfrastructureDetail>>
>;

export type ReportReadinessItem = {
  key: string;
  label: string;
  description: string;
  status: "ready" | "warning" | "missing" | "not_applicable";
  tone: StatusTone;
  value: string;
  blocking: boolean;
};

export type ReportReadinessSummary = {
  score: number;
  tone: StatusTone;
  label: string;
  summary: string;
  completedCount: number;
  applicableCount: number;
  blockers: ReportReadinessItem[];
  warnings: ReportReadinessItem[];
  items: ReportReadinessItem[];
};

export type CommissioningReportSnapshot = {
  scope: "project" | "site";
  reportTitle: string;
  generatedAt: Date;
  generatedBy: string;
  organization: {
    id: string;
    name: string;
    href: string;
  };
  project: {
    id: string;
    name: string;
    href: string;
    projectCode: string | null;
    status: string;
    projectType: string;
    priority: string;
    installationDate: Date | null;
    goLiveDate: Date | null;
    handoffStatus: string;
    monitoringReady: boolean;
    clientContactName: string | null;
    clientContactEmail: string | null;
    clientContactPhone: string | null;
    internalProjectManager: string | null;
    leadTechnician: string | null;
    salesOwner: string | null;
    scopeSummary: string | null;
    clientFacingNotes: string | null;
    remoteAccessMethod: string | null;
  } | null;
  site: {
    id: string;
    name: string;
    href: string;
    address: string;
    timezone: string | null;
    status: string;
    notes: string | null;
  } | null;
  linkedSites: Array<{
    id: string;
    name: string;
    href: string;
    location: string;
    status: string;
    roleOrPhase: string | null;
    deviceCount: number;
    activeAlertsCount: number;
    healthLabel: string;
    healthTone: StatusTone;
  }>;
  linkedProjects: Array<{
    id: string;
    name: string;
    href: string;
    status: string;
    roleOrPhase: string | null;
    monitoringReady: boolean;
  }>;
  infrastructureSummary: {
    totalDevices: number;
    routers: number;
    switches: number;
    nvrs: number;
    cameras: number;
    accessPoints: number;
    otherDevices: number;
    activeAlerts: number;
    offlineDevices: number;
  };
  networkSegments: Array<{
    id: string;
    name: string;
    vlanId: number | null;
    subnetCidr: string;
    gatewayIp: string | null;
    purpose: string | null;
    notes: string | null;
    siteName: string;
  }>;
  accessReferences: Array<{
    id: string;
    name: string;
    accessType: string;
    vaultProvider: string | null;
    vaultPath: string | null;
    owner: string | null;
    remoteAccessMethod: string | null;
    lastValidatedAt: Date | null;
    scopeLabel: string;
    notes: string | null;
  }>;
  nvrAssignments: Array<{
    id: string;
    nvrName: string;
    cameraName: string;
    channelNumber: number;
    recordingEnabled: boolean;
    siteName: string;
    cameraStatus: string | null;
    notes: string | null;
  }>;
  deviceLinks: Array<{
    id: string;
    sourceDeviceName: string;
    targetDeviceName: string;
    linkType: string;
    sourcePort: string | null;
    targetPort: string | null;
    poeProvided: boolean | null;
    siteName: string;
    notes: string | null;
  }>;
  readiness: ReportReadinessSummary;
  alerts: Awaited<ReturnType<typeof getRecentAlertsForScope>>;
  healthTimeline: HealthTimelineEntry[];
  topology: TopologySnapshot;
  capacity: CapacitySnapshot;
};

function buildReadinessItem(input: {
  key: string;
  label: string;
  description: string;
  status: ReportReadinessItem["status"];
  value: string;
  blocking?: boolean;
}): ReportReadinessItem {
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

function finalizeReadinessSummary(
  items: ReportReadinessItem[],
  baseSummary?: string
): ReportReadinessSummary {
  const applicableItems = items.filter((item) => item.status !== "not_applicable");
  const readyCount = applicableItems.filter((item) => item.status === "ready").length;
  const blockers = items.filter((item) => item.blocking && item.status !== "ready");
  const warnings = items.filter((item) => item.status === "warning");
  const score =
    applicableItems.length > 0
      ? Math.round((readyCount / applicableItems.length) * 100)
      : 0;

  let tone: StatusTone = "healthy";
  let label = "Commissioning ready";
  let summary =
    baseSummary ??
    "The record contains the operational context expected for managed monitoring and maintenance handoff.";

  if (blockers.length > 0) {
    tone = "critical";
    label = "Commissioning blocked";
    summary =
      "Required onboarding records are still missing before this deployment should be considered fully commissioned.";
  } else if (warnings.length > 0 || score < 100) {
    tone = "warning";
    label = "Commissioning in progress";
    summary =
      "The deployment is documented, but some operational coverage or engineering metadata still needs review.";
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

function getGeneratedByLabel(user: TenantUser) {
  return user.name?.trim() || user.email || "NetworkConnectIT operator";
}

function getAccessReferenceScopeLabel(input: {
  site?: { name: string } | null;
  device?: { name: string; type?: string } | null;
  projectInstallationId?: string | null;
}) {
  if (input.device) {
    return `Device · ${input.device.name}`;
  }

  if (input.site) {
    return `Site · ${input.site.name}`;
  }

  if (input.projectInstallationId) {
    return "Project";
  }

  return "Organization";
}

function buildProjectReadinessSummary(
  project: ProjectDetailRecord
): ReportReadinessSummary {
  return {
    ...project.readiness,
    blockers: project.readiness.blockers as ReportReadinessItem[],
    warnings: project.readiness.warnings as ReportReadinessItem[],
    items: project.readiness.items as ReportReadinessItem[]
  };
}

function buildSiteReadinessSummary(input: {
  linkedProjectsCount: number;
  totalDevices: number;
  routers: number;
  switches: number;
  nvrs: number;
  cameras: number;
  accessPoints: number;
  networkSegmentsCount: number;
  accessReferencesCount: number;
  nvrAssignmentsCount: number;
  deviceLinksCount: number;
  monitoringReadyDevicesCount: number;
  healthChecksCount: number;
  activeCriticalAlertsCount: number;
  capacity: CapacitySnapshot;
}) {
  const monitoringCoverage =
    input.totalDevices > 0
      ? input.monitoringReadyDevicesCount / input.totalDevices
      : 0;
  const requiresNvrMappings = input.nvrs > 0 && input.cameras > 0;
  const requiresTopology =
    input.totalDevices > 1 &&
    (input.routers + input.switches + input.nvrs > 0);
  const needsPoeModeling =
    input.switches > 0 && (input.cameras > 0 || input.accessPoints > 0);

  const items: ReportReadinessItem[] = [
    buildReadinessItem({
      key: "linked-projects",
      label: "Linked project context",
      description:
        "The site is attached to an installation record so commissioning and support history stay traceable.",
      status: input.linkedProjectsCount > 0 ? "ready" : "warning",
      value:
        input.linkedProjectsCount > 0
          ? `${input.linkedProjectsCount} linked`
          : "Standalone site record"
    }),
    buildReadinessItem({
      key: "core-infrastructure",
      label: "Core infrastructure",
      description:
        "Routers, switches, or NVRs are registered so the site can be operated and supported.",
      status:
        input.routers + input.switches + input.nvrs > 0 ? "ready" : "missing",
      value: `${input.routers + input.switches + input.nvrs} core assets`,
      blocking: true
    }),
    buildReadinessItem({
      key: "network-segments",
      label: "Network segments",
      description:
        "Management, camera, or wireless subnets are documented for this location.",
      status: input.networkSegmentsCount > 0 ? "ready" : "missing",
      value: `${input.networkSegmentsCount} recorded`,
      blocking: true
    }),
    buildReadinessItem({
      key: "access-references",
      label: "Secure access references",
      description:
        "Vault paths or remote-access references exist without storing raw secrets.",
      status: input.accessReferencesCount > 0 ? "ready" : "warning",
      value: `${input.accessReferencesCount} references`
    }),
    buildReadinessItem({
      key: "nvr-mapping",
      label: "NVR and camera mapping",
      description:
        "Recorder channels are mapped to cameras where video infrastructure exists.",
      status: !requiresNvrMappings
        ? "not_applicable"
        : input.nvrAssignmentsCount >= input.cameras
          ? "ready"
          : input.nvrAssignmentsCount > 0
            ? "warning"
            : "missing",
      value: requiresNvrMappings
        ? `${input.nvrAssignmentsCount} / ${input.cameras}`
        : "Not required",
      blocking: requiresNvrMappings
    }),
    buildReadinessItem({
      key: "device-links",
      label: "Device relationships",
      description:
        "Upstream/downstream links are documented for switching, recording, and edge devices.",
      status: !requiresTopology
        ? "not_applicable"
        : input.deviceLinksCount > 0
          ? "ready"
          : "warning",
      value: requiresTopology ? `${input.deviceLinksCount} links` : "Not required"
    }),
    buildReadinessItem({
      key: "monitoring-coverage",
      label: "Monitoring coverage",
      description:
        "Devices are assigned to active or passive monitoring rather than remaining manual-only.",
      status:
        input.totalDevices === 0
          ? "missing"
          : monitoringCoverage >= 0.85
            ? "ready"
            : monitoringCoverage > 0
              ? "warning"
              : "missing",
      value:
        input.totalDevices > 0
          ? `${Math.round(monitoringCoverage * 100)}% coverage`
          : "No devices registered",
      blocking: input.totalDevices > 0
    }),
    buildReadinessItem({
      key: "telemetry-history",
      label: "Health telemetry",
      description:
        "Recent health checks exist so the site is visible in monitoring and incident review.",
      status: input.healthChecksCount > 0 ? "ready" : "warning",
      value: `${input.healthChecksCount} checks`
    }),
    buildReadinessItem({
      key: "capacity-modeling",
      label: "PoE and capacity review",
      description:
        "Switch budgets, mapped PoE sources, and watt estimates are present enough for headroom analysis.",
      status: !needsPoeModeling
        ? "not_applicable"
        : input.capacity.summary.switchesOverCapacity > 0
          ? "warning"
          : input.capacity.summary.devicesMissingPoeSourceMapping > 0 ||
              input.capacity.summary.devicesMissingEstimatedWatts > 0 ||
              input.capacity.summary.switchesMissingBudget > 0
            ? "warning"
            : "ready",
      value: !needsPoeModeling
        ? "Not required"
        : `${input.capacity.summary.switchesRequiringReview} switches require review`
    }),
    buildReadinessItem({
      key: "critical-alerts",
      label: "Critical conditions",
      description:
        "No active critical alerts are currently blocking handoff or support readiness.",
      status: input.activeCriticalAlertsCount === 0 ? "ready" : "warning",
      value:
        input.activeCriticalAlertsCount === 0
          ? "No active critical alerts"
          : `${input.activeCriticalAlertsCount} active critical alerts`
    })
  ];

  return finalizeReadinessSummary(items);
}

export async function getProjectCommissioningReport(
  user: TenantUser,
  projectId: string
) {
  const project = await getProjectDetail(user, projectId);

  if (!project) {
    return null;
  }

  const [topology, capacity, alerts, healthTimeline, primarySiteDetail] =
    await Promise.all([
      getProjectTopologySnapshot(user, project.id),
      getProjectCapacitySnapshot(user, project.id),
      getRecentAlertsForScope(user, {
        projectInstallationId: project.id,
        limit: 12
      }),
      getProjectHealthTimeline(user, project.id, 12),
      project.primarySiteId ? getSiteDetail(user, project.primarySiteId) : Promise.resolve(null)
    ]);

  if (!topology || !capacity) {
    return null;
  }

  return {
    scope: "project" as const,
    reportTitle: "Project Commissioning & Handoff Report",
    generatedAt: new Date(),
    generatedBy: getGeneratedByLabel(user),
    organization: {
      id: project.organization.id,
      name: project.organization.name,
      href: `/organizations/${project.organization.id}`
    },
    project: {
      id: project.id,
      name: project.name,
      href: `/projects/${project.id}`,
      projectCode: project.projectCode,
      status: project.status,
      projectType: project.projectType,
      priority: project.priority,
      installationDate: project.installationDate,
      goLiveDate: project.goLiveDate,
      handoffStatus: project.handoffStatus,
      monitoringReady: project.monitoringReady,
      clientContactName: project.clientContactName,
      clientContactEmail: project.clientContactEmail,
      clientContactPhone: project.clientContactPhone,
      internalProjectManager: project.internalProjectManager,
      leadTechnician: project.leadTechnician,
      salesOwner: project.salesOwner,
      scopeSummary: project.scopeSummary,
      clientFacingNotes: project.clientFacingNotes,
      remoteAccessMethod: project.remoteAccessMethod
    },
    site: primarySiteDetail
      ? {
          id: primarySiteDetail.id,
          name: primarySiteDetail.name,
          href: `/sites/${primarySiteDetail.id}`,
          address: formatLocation([
            primarySiteDetail.addressLine1,
            primarySiteDetail.addressLine2,
            primarySiteDetail.city,
            primarySiteDetail.stateRegion,
            primarySiteDetail.postalCode,
            primarySiteDetail.country
          ]),
          timezone: primarySiteDetail.timezone,
          status: primarySiteDetail.status,
          notes: primarySiteDetail.notes
        }
      : null,
    linkedSites: project.projectSites.map((projectSite) => ({
      id: projectSite.site.id,
      name: projectSite.site.name,
      href: `/sites/${projectSite.site.id}`,
      location: formatLocation([projectSite.site.city, projectSite.site.country]),
      status: projectSite.site.status,
      roleOrPhase: projectSite.roleOrPhase,
      deviceCount: projectSite.site.deviceCount,
      activeAlertsCount: projectSite.site.activeAlertsCount,
      healthLabel: projectSite.site.healthSummary.label,
      healthTone: projectSite.site.healthSummary.health
    })),
    linkedProjects: [],
    infrastructureSummary: {
      totalDevices: topology.summary.totalDevices,
      routers: topology.summary.routers,
      switches: topology.summary.switches,
      nvrs: topology.summary.nvrs,
      cameras: topology.summary.cameras,
      accessPoints: topology.summary.accessPoints,
      otherDevices: topology.summary.otherDevices,
      activeAlerts: topology.summary.activeAlerts,
      offlineDevices: topology.summary.offlineDevices
    },
    networkSegments: project.networkSegments.map((segment) => ({
      id: segment.id,
      name: segment.name,
      vlanId: segment.vlanId,
      subnetCidr: segment.subnetCidr,
      gatewayIp: segment.gatewayIp,
      purpose: segment.purpose,
      notes: segment.notes,
      siteName: segment.site.name
    })),
    accessReferences: project.accessReferences.map((reference) => ({
      id: reference.id,
      name: reference.name,
      accessType: reference.accessType,
      vaultProvider: reference.vaultProvider,
      vaultPath: reference.vaultPath,
      owner: reference.owner,
      remoteAccessMethod: reference.remoteAccessMethod,
      lastValidatedAt: reference.lastValidatedAt,
      scopeLabel: getAccessReferenceScopeLabel({
        site: reference.site,
        device: reference.device,
        projectInstallationId: reference.projectInstallationId
      }),
      notes: reference.notes
    })),
    nvrAssignments: project.nvrChannelAssignments.map((assignment) => ({
      id: assignment.id,
      nvrName: assignment.nvrDevice.name,
      cameraName: assignment.cameraDevice.name,
      channelNumber: assignment.channelNumber,
      recordingEnabled: assignment.recordingEnabled,
      siteName: assignment.site.name,
      cameraStatus: null,
      notes: assignment.notes
    })),
    deviceLinks: project.deviceLinks.map((deviceLink) => ({
      id: deviceLink.id,
      sourceDeviceName: deviceLink.sourceDevice.name,
      targetDeviceName: deviceLink.targetDevice.name,
      linkType: deviceLink.linkType,
      sourcePort: deviceLink.sourcePort,
      targetPort: deviceLink.targetPort,
      poeProvided: deviceLink.poeProvided,
      siteName: deviceLink.site.name,
      notes: deviceLink.notes
    })),
    readiness: buildProjectReadinessSummary(project),
    alerts,
    healthTimeline,
    topology,
    capacity
  } satisfies CommissioningReportSnapshot;
}

export async function getSiteCommissioningReport(
  user: TenantUser,
  siteId: string
) {
  const [site, infrastructure, topology, capacity, alerts, healthTimeline] =
    await Promise.all([
      getSiteDetail(user, siteId),
      getSiteInfrastructureDetail(user, siteId),
      getSiteTopologySnapshot(user, siteId),
      getSiteCapacitySnapshot(user, siteId),
      getRecentAlertsForScope(user, {
        siteId,
        limit: 12
      }),
      getSiteHealthTimeline(user, siteId, 12)
    ]);

  if (!site || !infrastructure || !topology || !capacity) {
    return null;
  }

  const [healthChecksCount, activeCriticalAlertsCount, monitoringReadyDevicesCount] =
    await Promise.all([
    prisma.healthCheck.count({
      where: {
        device: {
          is: {
            siteId,
            ...getScopedRecordWhere(user)
          }
        }
      }
    }),
    prisma.alert.count({
      where: {
        siteId,
        ...getScopedRecordWhere(user),
        severity: AlertSeverity.CRITICAL,
        status: {
          in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED]
        }
      }
    }),
    prisma.device.count({
      where: {
        siteId,
        ...getScopedRecordWhere(user),
        monitoringMode: {
          not: MonitoringMode.MANUAL
        }
      }
    })
  ]);

  const readiness = buildSiteReadinessSummary({
    linkedProjectsCount: infrastructure.projects.length,
    totalDevices: topology.summary.totalDevices,
    routers: topology.summary.routers,
    switches: topology.summary.switches,
    nvrs: topology.summary.nvrs,
    cameras: topology.summary.cameras,
    accessPoints: topology.summary.accessPoints,
    networkSegmentsCount: infrastructure.networkSegments.length,
    accessReferencesCount: infrastructure.accessReferences.length,
    nvrAssignmentsCount: infrastructure.nvrAssignments.length,
    deviceLinksCount: infrastructure.deviceLinks.length,
    monitoringReadyDevicesCount,
    healthChecksCount,
    activeCriticalAlertsCount,
    capacity
  });

  return {
    scope: "site" as const,
    reportTitle: "Site Commissioning & Handoff Report",
    generatedAt: new Date(),
    generatedBy: getGeneratedByLabel(user),
    organization: {
      id: site.organization.id,
      name: site.organization.name,
      href: `/organizations/${site.organization.id}`
    },
    project: null,
    site: {
      id: site.id,
      name: site.name,
      href: `/sites/${site.id}`,
      address: formatLocation([
        site.addressLine1,
        site.addressLine2,
        site.city,
        site.stateRegion,
        site.postalCode,
        site.country
      ]),
      timezone: site.timezone,
      status: site.status,
      notes: site.notes
    },
    linkedSites: [],
    linkedProjects: infrastructure.projects.map((projectSite) => ({
      id: projectSite.projectInstallation.id,
      name: projectSite.projectInstallation.name,
      href: `/projects/${projectSite.projectInstallation.id}`,
      status: projectSite.projectInstallation.status,
      roleOrPhase: projectSite.roleOrPhase,
      monitoringReady: projectSite.projectInstallation.monitoringReady
    })),
    infrastructureSummary: {
      totalDevices: topology.summary.totalDevices,
      routers: topology.summary.routers,
      switches: topology.summary.switches,
      nvrs: topology.summary.nvrs,
      cameras: topology.summary.cameras,
      accessPoints: topology.summary.accessPoints,
      otherDevices: topology.summary.otherDevices,
      activeAlerts: topology.summary.activeAlerts,
      offlineDevices: topology.summary.offlineDevices
    },
    networkSegments: infrastructure.networkSegments.map((segment) => ({
      id: segment.id,
      name: segment.name,
      vlanId: segment.vlanId,
      subnetCidr: segment.subnetCidr,
      gatewayIp: segment.gatewayIp,
      purpose: segment.purpose,
      notes: segment.notes,
      siteName: site.name
    })),
    accessReferences: infrastructure.accessReferences.map((reference) => ({
      id: reference.id,
      name: reference.name,
      accessType: reference.accessType,
      vaultProvider: reference.vaultProvider,
      vaultPath: reference.vaultPath,
      owner: reference.owner,
      remoteAccessMethod: reference.remoteAccessMethod,
      lastValidatedAt: reference.lastValidatedAt,
      scopeLabel: getAccessReferenceScopeLabel({
        site: site,
        device: reference.device,
        projectInstallationId: reference.projectInstallation?.id ?? null
      }),
      notes: reference.notes
    })),
    nvrAssignments: infrastructure.nvrAssignments.map((assignment) => ({
      id: assignment.id,
      nvrName: assignment.nvrDevice.name,
      cameraName: assignment.cameraDevice.name,
      channelNumber: assignment.channelNumber,
      recordingEnabled: assignment.recordingEnabled,
      siteName: site.name,
      cameraStatus: assignment.cameraDevice.status,
      notes: assignment.notes
    })),
    deviceLinks: infrastructure.deviceLinks.map((deviceLink) => ({
      id: deviceLink.id,
      sourceDeviceName: deviceLink.sourceDevice.name,
      targetDeviceName: deviceLink.targetDevice.name,
      linkType: deviceLink.linkType,
      sourcePort: deviceLink.sourcePort,
      targetPort: deviceLink.targetPort,
      poeProvided: deviceLink.poeProvided,
      siteName: site.name,
      notes: deviceLink.notes
    })),
    readiness,
    alerts,
    healthTimeline,
    topology,
    capacity
  } satisfies CommissioningReportSnapshot;
}
