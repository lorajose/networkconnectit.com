import type { DashboardMetric, FilterToken, StatusTone } from "@/lib/dashboard/types";

export const commandMapHealthStates = [
  "healthy",
  "warning",
  "critical",
  "unknown"
] as const;

export const commandMapAlertSeverityPresenceOptions = [
  "any",
  "low",
  "medium",
  "high",
  "critical"
] as const;

export const commandMapOfflinePresenceOptions = [
  "with_offline",
  "without_offline"
] as const;

export type CommandMapHealthState = (typeof commandMapHealthStates)[number];
export type CommandMapAlertSeverityPresence =
  (typeof commandMapAlertSeverityPresenceOptions)[number];
export type CommandMapOfflinePresence =
  (typeof commandMapOfflinePresenceOptions)[number];

export type CommandMapFilters = {
  organizationId: string;
  projectInstallationId: string;
  country: string;
  healthState: CommandMapHealthState | "";
  alertSeverityPresence: CommandMapAlertSeverityPresence | "";
  offlinePresence: CommandMapOfflinePresence | "";
};

export type CommandMapSelectOption = {
  id: string;
  label: string;
};

export type CommandMapProjectLink = {
  id: string;
  name: string;
  href: string;
};

export type CommandMapSiteRecord = {
  id: string;
  siteName: string;
  siteHref: string;
  organizationId: string;
  organizationName: string;
  organizationHref: string;
  city: string;
  country: string;
  coordinates: [number, number] | null;
  health: StatusTone;
  deviceCount: number;
  offlineDevices: number;
  activeAlerts: number;
  criticalAlerts: number;
  alertSeverities: Array<"low" | "medium" | "high" | "critical">;
  latestHealthAt: string | null;
  latestHealthStatus: StatusTone;
  latestHealthDeviceName: string | null;
  latestHealthMessage: string | null;
  projectLinks: CommandMapProjectLink[];
  primaryProject: CommandMapProjectLink | null;
  deviceTypeCounts: {
    routers: number;
    switches: number;
    nvrs: number;
    cameras: number;
    accessPoints: number;
    other: number;
  };
};

export type CommandMapIssueSite = {
  id: string;
  siteName: string;
  siteHref: string;
  organizationName: string;
  projectName: string | null;
  projectHref: string | null;
  health: StatusTone;
  activeAlerts: number;
  offlineDevices: number;
  deviceCount: number;
  latestHealthAt: string | null;
};

export type CommandMapProjectIssueRecord = {
  id: string;
  name: string;
  href: string;
  organizationName: string;
  siteCount: number;
  activeAlerts: number;
  offlineDevices: number;
  issueScore: number;
  health: StatusTone;
};

export type CommandMapRecentAlert = {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "acknowledged" | "resolved";
  organizationName: string;
  siteName: string;
  deviceName: string | null;
  createdAt: string;
  href: string;
  siteHref: string | null;
  projectHref: string | null;
};

export type CommandMapMonitoringActivity = {
  id: string;
  status: StatusTone;
  checkedAt: string;
  message: string | null;
  deviceName: string;
  siteName: string;
  siteHref: string;
  organizationName: string;
};

export type CommandMapSnapshot = {
  title: string;
  subtitle: string;
  breadcrumbs: Array<{
    label: string;
    href?: string;
  }>;
  metrics: DashboardMetric[];
  activeFilters: FilterToken[];
  filterOptions: {
    organizations: CommandMapSelectOption[];
    projects: CommandMapSelectOption[];
    countries: CommandMapSelectOption[];
  };
  selectedFilters: CommandMapFilters;
  map: {
    center: [number, number];
    zoom: number;
    sites: CommandMapSiteRecord[];
    mappedSiteCount: number;
  };
  panel: {
    criticalSites: CommandMapIssueSite[];
    recentAlerts: CommandMapRecentAlert[];
    topProjects: CommandMapProjectIssueRecord[];
    offlineSites: CommandMapIssueSite[];
    recentMonitoring: CommandMapMonitoringActivity[];
  };
};
