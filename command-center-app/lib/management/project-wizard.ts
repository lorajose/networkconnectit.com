import {
  AccessType,
  DeviceLinkType,
  DeviceStatus,
  DeviceType,
  HandoffStatus,
  MonitoringMode,
  OrganizationStatus,
  ProjectInstallationStatus,
  ProjectPriority,
  ProjectType,
  SiteStatus
} from "@prisma/client";

import type { StatusTone } from "@/lib/dashboard/types";
import type { OrganizationOption } from "@/lib/management/organizations";
import { getOrganizationOptions } from "@/lib/management/organizations";
import { getSiteOptions, type SiteOption } from "@/lib/management/sites";
import type { TenantUser } from "@/lib/management/tenant";
import { isGlobalAccessUser } from "@/lib/management/tenant";
import type { ProjectWizardDraftValues } from "@/lib/validations/project-wizard";

export type WizardReadinessItem = {
  key: string;
  label: string;
  description: string;
  value: string;
  tone: StatusTone;
  status: "ready" | "warning" | "missing" | "not_applicable";
};

export type WizardReviewSummary = {
  linkedSitesCount: number;
  linkedDevicesCount: number;
  totalCameras: number;
  totalNvrs: number;
  totalSwitches: number;
  totalRouters: number;
  totalAccessPoints: number;
  totalNetworkSegments: number;
  accessReferencesCount: number;
  nvrMappingsCount: number;
  deviceLinksCount: number;
  monitoringReadyDevicesCount: number;
  readinessScore: number;
  readinessLabel: string;
  readinessTone: StatusTone;
  readinessItems: WizardReadinessItem[];
};

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyProjectWizardDraft(
  options?: {
    lockOrganizationId?: string | null;
    canCreateOrganizations?: boolean;
  }
): ProjectWizardDraftValues {
  const organizationMode =
    options?.lockOrganizationId || !options?.canCreateOrganizations ? "existing" : "existing";

  return {
    organization: {
      mode: organizationMode,
      existingOrganizationId: options?.lockOrganizationId ?? "",
      newOrganization: {
        name: "",
        slug: "",
        contactName: "",
        contactEmail: "",
        phone: "",
        status: OrganizationStatus.ONBOARDING
      }
    },
    site: {
      mode: "existing",
      existingSiteId: "",
      newSite: {
        name: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        stateRegion: "",
        postalCode: "",
        country: "",
        latitude: "",
        longitude: "",
        timezone: "",
        status: SiteStatus.ACTIVE,
        notes: ""
      }
    },
    project: {
      name: "",
      projectCode: "",
      status: ProjectInstallationStatus.PLANNING,
      projectType: ProjectType.INSTALLATION,
      priority: ProjectPriority.MEDIUM,
      installationDate: "",
      goLiveDate: "",
      clientContactName: "",
      clientContactEmail: "",
      clientContactPhone: "",
      internalProjectManager: "",
      leadTechnician: "",
      salesOwner: "",
      scopeSummary: "",
      remoteAccessMethod: "",
      handoffStatus: HandoffStatus.NOT_STARTED,
      monitoringReady: false,
      vendorSystemsPlanned: "",
      externalReference: "",
      internalNotes: "",
      clientFacingNotes: ""
    },
    networkSegments: [],
    coreDevices: [],
    edgeDevices: [],
    mappings: {
      nvrAssignments: [],
      deviceLinks: []
    },
    accessAndMonitoring: {
      accessReferences: []
    }
  };
}

export function createEmptyNetworkSegment(): ProjectWizardDraftValues["networkSegments"][number] {
  return {
    clientId: createId("segment"),
    name: "",
    vlanId: "",
    subnetCidr: "",
    gatewayIp: "",
    purpose: "",
    notes: ""
  };
}

export function createEmptyCoreDevice(
  type: ProjectWizardDraftValues["coreDevices"][number]["type"] = DeviceType.ROUTER
): ProjectWizardDraftValues["coreDevices"][number] {
  return {
    clientId: createId("core"),
    name: "",
    type,
    brand: "",
    model: "",
    hostname: "",
    ipAddress: "",
    macAddress: "",
    serialNumber: "",
    firmwareVersion: "",
    monitoringMode: MonitoringMode.ACTIVE,
    status: DeviceStatus.UNKNOWN,
    installedAt: "",
    lastSeenAt: "",
    networkSegmentClientId: "",
    vendorExternalId: "",
    notes: ""
  };
}

export function createEmptyEdgeDevice(
  type: ProjectWizardDraftValues["edgeDevices"][number]["type"] = DeviceType.CAMERA
): ProjectWizardDraftValues["edgeDevices"][number] {
  return {
    clientId: createId("edge"),
    name: "",
    type,
    brand: "",
    model: "",
    hostname: "",
    ipAddress: "",
    macAddress: "",
    serialNumber: "",
    firmwareVersion: "",
    monitoringMode: MonitoringMode.ACTIVE,
    status: DeviceStatus.UNKNOWN,
    installedAt: "",
    lastSeenAt: "",
    networkSegmentClientId: "",
    vendorExternalId: "",
    notes: "",
    mountLocation: ""
  };
}

export function createEmptyNvrAssignment(): ProjectWizardDraftValues["mappings"]["nvrAssignments"][number] {
  return {
    clientId: createId("nvrmap"),
    nvrDeviceClientId: "",
    cameraDeviceClientId: "",
    channelNumber: "",
    recordingEnabled: true,
    notes: ""
  };
}

export function createEmptyDeviceLink(): ProjectWizardDraftValues["mappings"]["deviceLinks"][number] {
  return {
    clientId: createId("link"),
    sourceDeviceClientId: "",
    targetDeviceClientId: "",
    linkType: DeviceLinkType.UPLINK,
    sourcePort: "",
    targetPort: "",
    poeProvided: "",
    notes: ""
  };
}

export function createEmptyAccessReference(): ProjectWizardDraftValues["accessAndMonitoring"]["accessReferences"][number] {
  return {
    clientId: createId("access"),
    scope: "PROJECT" as const,
    deviceClientId: "",
    name: "",
    accessType: AccessType.VPN,
    vaultProvider: "",
    vaultPath: "",
    owner: "",
    remoteAccessMethod: "",
    notes: "",
    lastValidatedAt: ""
  };
}

function makeReadinessItem(input: {
  key: string;
  label: string;
  description: string;
  status: WizardReadinessItem["status"];
  value: string;
}): WizardReadinessItem {
  const toneMap: Record<WizardReadinessItem["status"], StatusTone> = {
    ready: "healthy",
    warning: "warning",
    missing: "critical",
    not_applicable: "info"
  };

  return {
    ...input,
    tone: toneMap[input.status]
  };
}

export function buildProjectWizardReviewSummary(
  draft: ProjectWizardDraftValues
): WizardReviewSummary {
  const linkedSitesCount = draft.site.mode === "existing"
    ? (draft.site.existingSiteId ? 1 : 0)
    : (draft.site.newSite.name.trim() ? 1 : 0);
  const allDevices = [...draft.coreDevices, ...draft.edgeDevices];
  const totalRouters = draft.coreDevices.filter((device) => device.type === DeviceType.ROUTER).length;
  const totalSwitches = draft.coreDevices.filter((device) => device.type === DeviceType.SWITCH).length;
  const totalNvrs = draft.coreDevices.filter((device) => device.type === DeviceType.NVR).length;
  const totalAccessPoints = draft.coreDevices.filter((device) => device.type === DeviceType.ACCESS_POINT).length;
  const totalCameras = draft.edgeDevices.filter((device) => device.type === DeviceType.CAMERA).length;
  const monitoringReadyDevicesCount = allDevices.filter(
    (device) => device.monitoringMode !== MonitoringMode.MANUAL
  ).length;
  const coreDevicesCount = totalRouters + totalSwitches + totalNvrs + totalAccessPoints;
  const requiresNvrMappings = totalNvrs > 0 && totalCameras > 0;
  const requiresLinks = allDevices.length > 1 && coreDevicesCount > 0;
  const readinessItems: WizardReadinessItem[] = [
    makeReadinessItem({
      key: "organization",
      label: "Organization selected",
      description: "A valid customer organization exists or will be created during final submission.",
      status:
        draft.organization.mode === "existing"
          ? draft.organization.existingOrganizationId
            ? "ready"
            : "missing"
          : draft.organization.newOrganization.name.trim() &&
              draft.organization.newOrganization.slug.trim()
            ? "ready"
            : "missing",
      value:
        draft.organization.mode === "existing"
          ? draft.organization.existingOrganizationId
            ? "Existing organization selected"
            : "Select an organization"
          : draft.organization.newOrganization.name.trim()
            ? draft.organization.newOrganization.name
            : "New organization details missing"
    }),
    makeReadinessItem({
      key: "site",
      label: "Primary site prepared",
      description: "The deployment has one primary site ready to link into the installation record.",
      status:
        linkedSitesCount > 0
          ? "ready"
          : "missing",
      value: linkedSitesCount > 0 ? `${linkedSitesCount} site ready` : "No site selected"
    }),
    makeReadinessItem({
      key: "project",
      label: "Project profile",
      description: "The installation record has a name, lifecycle type, and operating metadata.",
      status: draft.project.name.trim() ? "ready" : "missing",
      value: draft.project.name.trim() || "Project name missing"
    }),
    makeReadinessItem({
      key: "network",
      label: "Network profile",
      description: "Management or camera VLANs/subnets are documented for onboarding.",
      status:
        draft.networkSegments.length > 0
          ? "ready"
          : "warning",
      value:
        draft.networkSegments.length > 0
          ? `${draft.networkSegments.length} segment${draft.networkSegments.length === 1 ? "" : "s"}`
          : "No network segments yet"
    }),
    makeReadinessItem({
      key: "core-devices",
      label: "Core infrastructure",
      description: "Routers, switches, NVRs, or APs are registered for the site.",
      status: coreDevicesCount > 0 ? "ready" : "warning",
      value: `${coreDevicesCount} core devices`
    }),
    makeReadinessItem({
      key: "edge-devices",
      label: "Edge devices",
      description: "Cameras and field devices are registered and ready for mapping.",
      status: draft.edgeDevices.length > 0 ? "ready" : "warning",
      value: `${draft.edgeDevices.length} edge devices`
    }),
    makeReadinessItem({
      key: "nvr-mapping",
      label: "NVR channel mapping",
      description: "Recorder channels are explicitly mapped to camera devices where recording exists.",
      status:
        !requiresNvrMappings
          ? "not_applicable"
          : draft.mappings.nvrAssignments.length >= totalCameras
            ? "ready"
            : draft.mappings.nvrAssignments.length > 0
              ? "warning"
              : "missing",
      value:
        !requiresNvrMappings
          ? "Not required"
          : `${draft.mappings.nvrAssignments.length}/${totalCameras} mapped`
    }),
    makeReadinessItem({
      key: "topology",
      label: "Topology relationships",
      description: "Device uplinks, downstream paths, and PoE relationships are documented.",
      status:
        !requiresLinks
          ? "not_applicable"
          : draft.mappings.deviceLinks.length > 0
            ? "ready"
            : "warning",
      value:
        !requiresLinks
          ? "Not required"
          : `${draft.mappings.deviceLinks.length} links mapped`
    }),
    makeReadinessItem({
      key: "access",
      label: "Access references",
      description: "Secure metadata-only access notes exist for project, site, or device scope.",
      status:
        draft.accessAndMonitoring.accessReferences.length > 0
          ? "ready"
          : "warning",
      value: `${draft.accessAndMonitoring.accessReferences.length} references`
    }),
    makeReadinessItem({
      key: "monitoring",
      label: "Monitoring readiness",
      description: "Devices are marked for active or passive monitoring instead of remaining manual-only.",
      status:
        allDevices.length === 0
          ? "warning"
          : monitoringReadyDevicesCount === allDevices.length
            ? "ready"
            : monitoringReadyDevicesCount > 0
              ? "warning"
              : "missing",
      value:
        allDevices.length > 0
          ? `${monitoringReadyDevicesCount}/${allDevices.length} devices`
          : "No devices yet"
    })
  ];

  const applicableItems = readinessItems.filter((item) => item.status !== "not_applicable");
  const readyItems = applicableItems.filter((item) => item.status === "ready").length;
  const blockers = readinessItems.filter((item) => item.status === "missing").length;
  const warnings = readinessItems.filter((item) => item.status === "warning").length;
  const readinessScore =
    applicableItems.length > 0 ? Math.round((readyItems / applicableItems.length) * 100) : 0;

  let readinessTone: StatusTone = "healthy";
  let readinessLabel = "Ready for review";

  if (blockers > 0) {
    readinessTone = "critical";
    readinessLabel = "Missing required onboarding data";
  } else if (warnings > 0) {
    readinessTone = "warning";
    readinessLabel = "Partially ready";
  }

  return {
    linkedSitesCount,
    linkedDevicesCount: allDevices.length,
    totalCameras,
    totalNvrs,
    totalSwitches,
    totalRouters,
    totalAccessPoints,
    totalNetworkSegments: draft.networkSegments.length,
    accessReferencesCount: draft.accessAndMonitoring.accessReferences.length,
    nvrMappingsCount: draft.mappings.nvrAssignments.length,
    deviceLinksCount: draft.mappings.deviceLinks.length,
    monitoringReadyDevicesCount,
    readinessScore,
    readinessLabel,
    readinessTone,
    readinessItems
  };
}

export async function getProjectWizardBootstrap(user: TenantUser): Promise<{
  organizations: OrganizationOption[];
  sites: SiteOption[];
  canCreateOrganizations: boolean;
  lockOrganizationId: string | null;
}> {
  const [organizations, sites] = await Promise.all([
    getOrganizationOptions(user),
    getSiteOptions(user)
  ]);

  return {
    organizations,
    sites,
    canCreateOrganizations: isGlobalAccessUser(user),
    lockOrganizationId: isGlobalAccessUser(user) ? null : user.organizationId
  };
}
