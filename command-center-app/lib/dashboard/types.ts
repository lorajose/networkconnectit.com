export type MetricTone = "neutral" | "cyan" | "healthy" | "warning" | "critical";

export type StatusTone =
  | "healthy"
  | "warning"
  | "critical"
  | "unknown"
  | "info";

export type MetricIconKey =
  | "organizations"
  | "organization"
  | "sites"
  | "devices"
  | "online"
  | "offline"
  | "alerts";

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export type AlertWorkflowStatus = "open" | "acknowledged" | "resolved";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type DashboardMetric = {
  id: string;
  label: string;
  value: string;
  helper: string;
  icon: MetricIconKey;
  tone: MetricTone;
};

export type StatusOverviewItem = {
  id: string;
  label: string;
  value: string;
  helper: string;
  tone: StatusTone;
};

export type FilterToken = {
  id: string;
  label: string;
  value: string;
};

export type MapSiteRecord = {
  id: string;
  organizationName: string;
  siteName: string;
  city: string;
  country: string;
  status: StatusTone;
  deviceCount: number;
  coordinates: [number, number];
  detailsHref: string;
};

export type AlertTableRow = {
  id: string;
  severity: AlertSeverity;
  title: string;
  organization: string;
  site: string;
  device: string;
  status: AlertWorkflowStatus;
  createdAt: string;
  alertHref?: string;
  organizationHref?: string;
  siteHref?: string;
  deviceHref?: string;
};

export type SiteHealthRow = {
  id: string;
  organization: string;
  site: string;
  location: string;
  devicesCount: number;
  onlineCount: number;
  offlineCount: number;
  warningCount?: number;
  unknownCount?: number;
  lastCheck: string | null;
  health: StatusTone;
  organizationHref?: string;
  siteHref?: string;
};

export type DeviceDistributionItem = {
  id: string;
  label: string;
  count: number;
  share: number;
  tone: MetricTone;
};

export type DashboardSnapshot = {
  variant: "super-admin" | "viewer";
  title: string;
  subtitle: string;
  organizationName?: string;
  breadcrumbs: BreadcrumbItem[];
  metrics: DashboardMetric[];
  statusOverview: StatusOverviewItem[];
  filters: FilterToken[];
  map: {
    title: string;
    description: string;
    size: "large" | "compact";
    center: [number, number];
    zoom: number;
    sites: MapSiteRecord[];
  };
  recentAlerts: {
    title: string;
    description: string;
    rows: AlertTableRow[];
  };
  siteHealth: {
    title: string;
    description: string;
    rows: SiteHealthRow[];
    compact?: boolean;
  };
  deviceDistribution: {
    title: string;
    description: string;
    items: DeviceDistributionItem[];
  };
};
