import type { DashboardSnapshot } from "@/lib/dashboard/types";

const sharedFilters = [
  {
    id: "time-window",
    label: "Time window",
    value: "Last 24 hours"
  },
  {
    id: "refresh",
    label: "Refresh model",
    value: "Mock telemetry"
  },
  {
    id: "scope",
    label: "Scope",
    value: "Live UI shell"
  }
] as const;

const globalMapSites = [
  {
    id: "site-new-york",
    organizationName: "Atlas Retail Group",
    siteName: "New York Flagship",
    city: "New York",
    country: "United States",
    status: "healthy",
    deviceCount: 74,
    coordinates: [40.7128, -74.006],
    detailsHref: "/sites"
  },
  {
    id: "site-toronto",
    organizationName: "Atlas Retail Group",
    siteName: "Toronto Distribution Hub",
    city: "Toronto",
    country: "Canada",
    status: "warning",
    deviceCount: 58,
    coordinates: [43.6532, -79.3832],
    detailsHref: "/sites"
  },
  {
    id: "site-london",
    organizationName: "Northbridge Logistics",
    siteName: "London Dock Operations",
    city: "London",
    country: "United Kingdom",
    status: "healthy",
    deviceCount: 92,
    coordinates: [51.5072, -0.1276],
    detailsHref: "/sites"
  },
  {
    id: "site-berlin",
    organizationName: "Helix Data Centers",
    siteName: "Berlin Edge Facility",
    city: "Berlin",
    country: "Germany",
    status: "critical",
    deviceCount: 43,
    coordinates: [52.52, 13.405],
    detailsHref: "/sites"
  },
  {
    id: "site-dubai",
    organizationName: "Meridian Properties",
    siteName: "Dubai Mixed Use Campus",
    city: "Dubai",
    country: "United Arab Emirates",
    status: "warning",
    deviceCount: 117,
    coordinates: [25.2048, 55.2708],
    detailsHref: "/sites"
  },
  {
    id: "site-singapore",
    organizationName: "Harbor Health Systems",
    siteName: "Singapore Clinical Tower",
    city: "Singapore",
    country: "Singapore",
    status: "healthy",
    deviceCount: 86,
    coordinates: [1.3521, 103.8198],
    detailsHref: "/sites"
  },
  {
    id: "site-sydney",
    organizationName: "Northbridge Logistics",
    siteName: "Sydney Port Storage",
    city: "Sydney",
    country: "Australia",
    status: "unknown",
    deviceCount: 51,
    coordinates: [-33.8688, 151.2093],
    detailsHref: "/sites"
  }
] as const satisfies DashboardSnapshot["map"]["sites"];

const globalAlerts = [
  {
    id: "alert-1",
    severity: "critical",
    title: "Recorder connectivity lost",
    organization: "Helix Data Centers",
    site: "Berlin Edge Facility",
    device: "NVR-EDGE-17",
    status: "open",
    createdAt: "2026-03-11T13:14:00Z"
  },
  {
    id: "alert-2",
    severity: "high",
    title: "Door controller battery threshold",
    organization: "Meridian Properties",
    site: "Dubai Mixed Use Campus",
    device: "AC-CTRL-04",
    status: "acknowledged",
    createdAt: "2026-03-11T12:46:00Z"
  },
  {
    id: "alert-3",
    severity: "medium",
    title: "Camera packet loss spike",
    organization: "Atlas Retail Group",
    site: "Toronto Distribution Hub",
    device: "CAM-NORTH-22",
    status: "open",
    createdAt: "2026-03-11T11:32:00Z"
  },
  {
    id: "alert-4",
    severity: "high",
    title: "Switch uplink degraded",
    organization: "Northbridge Logistics",
    site: "London Dock Operations",
    device: "SW-LON-CORE-2",
    status: "resolved",
    createdAt: "2026-03-11T10:04:00Z"
  },
  {
    id: "alert-5",
    severity: "low",
    title: "Scheduled firmware maintenance window",
    organization: "Harbor Health Systems",
    site: "Singapore Clinical Tower",
    device: "ROUTER-SG-01",
    status: "acknowledged",
    createdAt: "2026-03-11T08:21:00Z"
  }
] as const satisfies DashboardSnapshot["recentAlerts"]["rows"];

const globalSiteHealth = [
  {
    id: "health-1",
    organization: "Atlas Retail Group",
    site: "New York Flagship",
    location: "New York, United States",
    devicesCount: 74,
    onlineCount: 73,
    offlineCount: 1,
    lastCheck: "2026-03-11T13:12:00Z",
    health: "healthy"
  },
  {
    id: "health-2",
    organization: "Atlas Retail Group",
    site: "Toronto Distribution Hub",
    location: "Toronto, Canada",
    devicesCount: 58,
    onlineCount: 52,
    offlineCount: 6,
    lastCheck: "2026-03-11T13:09:00Z",
    health: "warning"
  },
  {
    id: "health-3",
    organization: "Helix Data Centers",
    site: "Berlin Edge Facility",
    location: "Berlin, Germany",
    devicesCount: 43,
    onlineCount: 31,
    offlineCount: 12,
    lastCheck: "2026-03-11T13:14:00Z",
    health: "critical"
  },
  {
    id: "health-4",
    organization: "Meridian Properties",
    site: "Dubai Mixed Use Campus",
    location: "Dubai, United Arab Emirates",
    devicesCount: 117,
    onlineCount: 109,
    offlineCount: 8,
    lastCheck: "2026-03-11T12:58:00Z",
    health: "warning"
  },
  {
    id: "health-5",
    organization: "Harbor Health Systems",
    site: "Singapore Clinical Tower",
    location: "Singapore, Singapore",
    devicesCount: 86,
    onlineCount: 85,
    offlineCount: 1,
    lastCheck: "2026-03-11T13:05:00Z",
    health: "healthy"
  },
  {
    id: "health-6",
    organization: "Northbridge Logistics",
    site: "Sydney Port Storage",
    location: "Sydney, Australia",
    devicesCount: 51,
    onlineCount: 44,
    offlineCount: 7,
    lastCheck: "2026-03-11T12:33:00Z",
    health: "unknown"
  }
] as const satisfies DashboardSnapshot["siteHealth"]["rows"];

const globalDeviceDistribution = [
  {
    id: "distribution-cameras",
    label: "IP Cameras",
    count: 648,
    share: 51,
    tone: "cyan"
  },
  {
    id: "distribution-switches",
    label: "Switches",
    count: 232,
    share: 18,
    tone: "healthy"
  },
  {
    id: "distribution-access-control",
    label: "Access Control",
    count: 140,
    share: 11,
    tone: "warning"
  },
  {
    id: "distribution-routers",
    label: "Routers",
    count: 96,
    share: 8,
    tone: "neutral"
  },
  {
    id: "distribution-nvrs",
    label: "NVRs",
    count: 88,
    share: 7,
    tone: "critical"
  },
  {
    id: "distribution-sensors",
    label: "Sensors",
    count: 64,
    share: 5,
    tone: "healthy"
  }
] as const satisfies DashboardSnapshot["deviceDistribution"]["items"];

const viewerMapSites = [
  {
    id: "viewer-site-new-york",
    organizationName: "Atlas Retail Group",
    siteName: "New York Flagship",
    city: "New York",
    country: "United States",
    status: "healthy",
    deviceCount: 74,
    coordinates: [40.7128, -74.006],
    detailsHref: "/sites"
  },
  {
    id: "viewer-site-toronto",
    organizationName: "Atlas Retail Group",
    siteName: "Toronto Distribution Hub",
    city: "Toronto",
    country: "Canada",
    status: "warning",
    deviceCount: 58,
    coordinates: [43.6532, -79.3832],
    detailsHref: "/sites"
  },
  {
    id: "viewer-site-madrid",
    organizationName: "Atlas Retail Group",
    siteName: "Madrid Retail Cluster",
    city: "Madrid",
    country: "Spain",
    status: "healthy",
    deviceCount: 67,
    coordinates: [40.4168, -3.7038],
    detailsHref: "/sites"
  },
  {
    id: "viewer-site-sao-paulo",
    organizationName: "Atlas Retail Group",
    siteName: "Sao Paulo Fulfillment",
    city: "Sao Paulo",
    country: "Brazil",
    status: "critical",
    deviceCount: 43,
    coordinates: [-23.5558, -46.6396],
    detailsHref: "/sites"
  }
] as const satisfies DashboardSnapshot["map"]["sites"];

const viewerAlerts = [
  {
    id: "viewer-alert-1",
    severity: "critical",
    title: "Fulfillment switch uplink offline",
    organization: "Atlas Retail Group",
    site: "Sao Paulo Fulfillment",
    device: "SW-BR-CORE-01",
    status: "open",
    createdAt: "2026-03-11T13:16:00Z"
  },
  {
    id: "viewer-alert-2",
    severity: "high",
    title: "Camera packet loss across dock lane",
    organization: "Atlas Retail Group",
    site: "Toronto Distribution Hub",
    device: "CAM-NORTH-22",
    status: "acknowledged",
    createdAt: "2026-03-11T12:41:00Z"
  },
  {
    id: "viewer-alert-3",
    severity: "medium",
    title: "Door controller reporting delayed sync",
    organization: "Atlas Retail Group",
    site: "Madrid Retail Cluster",
    device: "AC-MAD-08",
    status: "open",
    createdAt: "2026-03-11T11:18:00Z"
  },
  {
    id: "viewer-alert-4",
    severity: "low",
    title: "Firmware maintenance window pending",
    organization: "Atlas Retail Group",
    site: "New York Flagship",
    device: "NVR-NY-03",
    status: "acknowledged",
    createdAt: "2026-03-11T09:52:00Z"
  }
] as const satisfies DashboardSnapshot["recentAlerts"]["rows"];

const viewerSiteHealth = [
  {
    id: "viewer-health-1",
    organization: "Atlas Retail Group",
    site: "New York Flagship",
    location: "New York, United States",
    devicesCount: 74,
    onlineCount: 73,
    offlineCount: 1,
    lastCheck: "2026-03-11T13:12:00Z",
    health: "healthy"
  },
  {
    id: "viewer-health-2",
    organization: "Atlas Retail Group",
    site: "Toronto Distribution Hub",
    location: "Toronto, Canada",
    devicesCount: 58,
    onlineCount: 52,
    offlineCount: 6,
    lastCheck: "2026-03-11T13:09:00Z",
    health: "warning"
  },
  {
    id: "viewer-health-3",
    organization: "Atlas Retail Group",
    site: "Madrid Retail Cluster",
    location: "Madrid, Spain",
    devicesCount: 67,
    onlineCount: 65,
    offlineCount: 2,
    lastCheck: "2026-03-11T12:57:00Z",
    health: "healthy"
  },
  {
    id: "viewer-health-4",
    organization: "Atlas Retail Group",
    site: "Sao Paulo Fulfillment",
    location: "Sao Paulo, Brazil",
    devicesCount: 43,
    onlineCount: 34,
    offlineCount: 9,
    lastCheck: "2026-03-11T13:16:00Z",
    health: "critical"
  }
] as const satisfies DashboardSnapshot["siteHealth"]["rows"];

const viewerDeviceDistribution = [
  {
    id: "viewer-cameras",
    label: "IP Cameras",
    count: 172,
    share: 60,
    tone: "cyan"
  },
  {
    id: "viewer-switches",
    label: "Switches",
    count: 46,
    share: 16,
    tone: "healthy"
  },
  {
    id: "viewer-access-control",
    label: "Access Control",
    count: 30,
    share: 10,
    tone: "warning"
  },
  {
    id: "viewer-nvrs",
    label: "NVRs",
    count: 18,
    share: 6,
    tone: "critical"
  },
  {
    id: "viewer-routers",
    label: "Routers",
    count: 12,
    share: 4,
    tone: "neutral"
  },
  {
    id: "viewer-sensors",
    label: "Sensors",
    count: 8,
    share: 4,
    tone: "healthy"
  }
] as const satisfies DashboardSnapshot["deviceDistribution"]["items"];

export function buildSuperAdminSnapshot(): DashboardSnapshot {
  return {
    variant: "super-admin",
    title: "Global Operations Dashboard",
    subtitle:
      "Unified visibility for client sites, devices, and infrastructure worldwide.",
    breadcrumbs: [
      {
        label: "Command Center"
      },
      {
        label: "Dashboard"
      }
    ],
    metrics: [
      {
        id: "metric-organizations",
        label: "Total organizations",
        value: "12",
        helper: "Active client and internal operating entities.",
        icon: "organizations",
        tone: "cyan"
      },
      {
        id: "metric-sites",
        label: "Total sites",
        value: "48",
        helper: "Worldwide sites currently reporting into the command view.",
        icon: "sites",
        tone: "neutral"
      },
      {
        id: "metric-devices",
        label: "Total devices",
        value: "1,268",
        helper: "Connected field and infrastructure endpoints.",
        icon: "devices",
        tone: "neutral"
      },
      {
        id: "metric-online",
        label: "Devices online",
        value: "1,187",
        helper: "Devices responding within the latest health window.",
        icon: "online",
        tone: "healthy"
      },
      {
        id: "metric-offline",
        label: "Devices offline",
        value: "81",
        helper: "Endpoints requiring review, dispatch, or remote recovery.",
        icon: "offline",
        tone: "critical"
      },
      {
        id: "metric-alerts",
        label: "Active alerts",
        value: "17",
        helper: "Open or acknowledged events across all monitored clients.",
        icon: "alerts",
        tone: "warning"
      }
    ],
    statusOverview: [
      {
        id: "status-healthy-sites",
        label: "Healthy sites",
        value: "34",
        helper: "Sites within normal operating thresholds.",
        tone: "healthy"
      },
      {
        id: "status-warning-sites",
        label: "Warning sites",
        value: "9",
        helper: "Sites with degraded connectivity, power, or device health.",
        tone: "warning"
      },
      {
        id: "status-critical-sites",
        label: "Critical sites",
        value: "3",
        helper: "Sites requiring immediate attention or dispatch planning.",
        tone: "critical"
      },
      {
        id: "status-unknown-devices",
        label: "Unknown devices",
        value: "22",
        helper: "Endpoints missing recent telemetry or validation data.",
        tone: "unknown"
      },
      {
        id: "status-open-alerts",
        label: "Open alerts",
        value: "17",
        helper: "Unresolved alert events currently visible to operations.",
        tone: "info"
      }
    ],
    filters: [...sharedFilters],
    map: {
      title: "Global Site Visibility",
      description:
        "Operational geography for active customer and partner sites in the current command view.",
      size: "large",
      center: [23, 9],
      zoom: 2,
      sites: [...globalMapSites]
    },
    recentAlerts: {
      title: "Recent Alerts",
      description:
        "Latest cross-client alert activity prioritized for operational review.",
      rows: [...globalAlerts]
    },
    siteHealth: {
      title: "Site Health Summary",
      description:
        "Current device availability and last health window by operating site.",
      rows: [...globalSiteHealth]
    },
    deviceDistribution: {
      title: "Device Distribution",
      description:
        "Command-level device mix across camera, network, and control infrastructure.",
      items: [...globalDeviceDistribution]
    }
  };
}

export function buildViewerSnapshot(): DashboardSnapshot {
  return {
    variant: "viewer",
    title: "Organization Operations Dashboard",
    subtitle:
      "Unified visibility for your sites, devices, and infrastructure worldwide.",
    organizationName: "Atlas Retail Group",
    breadcrumbs: [
      {
        label: "Command Center"
      },
      {
        label: "Dashboard"
      }
    ],
    metrics: [
      {
        id: "metric-organization",
        label: "Organization",
        value: "Atlas Retail Group",
        helper: "Read-only operating view for your assigned organization.",
        icon: "organization",
        tone: "cyan"
      },
      {
        id: "metric-sites",
        label: "Total sites",
        value: "12",
        helper: "Client sites currently represented in this portal.",
        icon: "sites",
        tone: "neutral"
      },
      {
        id: "metric-devices",
        label: "Total devices",
        value: "286",
        helper: "Visible endpoints across your monitored locations.",
        icon: "devices",
        tone: "neutral"
      },
      {
        id: "metric-online",
        label: "Devices online",
        value: "271",
        helper: "Devices healthy within the most recent reporting cycle.",
        icon: "online",
        tone: "healthy"
      },
      {
        id: "metric-alerts",
        label: "Active alerts",
        value: "4",
        helper: "Current open or acknowledged issues affecting your sites.",
        icon: "alerts",
        tone: "warning"
      }
    ],
    statusOverview: [
      {
        id: "status-healthy-sites",
        label: "Healthy sites",
        value: "9",
        helper: "Sites reporting stable operating conditions.",
        tone: "healthy"
      },
      {
        id: "status-warning-sites",
        label: "Warning sites",
        value: "2",
        helper: "Sites with limited degradation requiring follow-up.",
        tone: "warning"
      },
      {
        id: "status-critical-sites",
        label: "Critical sites",
        value: "1",
        helper: "Sites with service-impacting issues under review.",
        tone: "critical"
      },
      {
        id: "status-unknown-devices",
        label: "Unknown devices",
        value: "7",
        helper: "Endpoints awaiting fresh telemetry validation.",
        tone: "unknown"
      },
      {
        id: "status-open-alerts",
        label: "Open alerts",
        value: "4",
        helper: "Current alert workload visible within this client portal.",
        tone: "info"
      }
    ],
    filters: [
      ...sharedFilters,
      {
        id: "organization",
        label: "Organization",
        value: "Assigned view"
      }
    ],
    map: {
      title: "Site Visibility",
      description:
        "Your monitored locations and their current operating posture.",
      size: "compact",
      center: [44.7, -37.4],
      zoom: 3,
      sites: [...viewerMapSites]
    },
    recentAlerts: {
      title: "Recent Alerts",
      description:
        "Most recent alert activity affecting your assigned organization.",
      rows: [...viewerAlerts]
    },
    siteHealth: {
      title: "Site Summary",
      description:
        "Current site availability for your operational footprint.",
      rows: [...viewerSiteHealth],
      compact: true
    },
    deviceDistribution: {
      title: "Device Distribution",
      description:
        "Current breakdown of the monitored device estate for your organization.",
      items: [...viewerDeviceDistribution]
    }
  };
}
