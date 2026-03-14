const {
  PrismaClient,
  Role,
  OrganizationStatus,
  SiteStatus,
  DeviceType,
  DeviceStatus,
  MonitoringMode,
  ProjectInstallationStatus,
  ProjectType,
  ProjectPriority,
  HandoffStatus,
  AccessType,
  DeviceLinkType,
  HealthStatus,
  HealthCheckType,
  AlertSeverity,
  AlertStatus
} = require("@prisma/client");
const { hash } = require("bcryptjs");

const prisma = new PrismaClient();

const DEMO_PASSWORD = "CommandCenterDemo!2026";
const now = new Date();

const organizationsSeed = [
  {
    name: "Midtown Medical Group",
    slug: "midtown-medical-group",
    contactName: "Lena Morales",
    contactEmail: "lena.morales@midtownmedical.demo",
    phone: "+1 212 555 0142",
    status: OrganizationStatus.ACTIVE,
    sites: [
      {
        name: "Manhattan Surgical Pavilion",
        addressLine1: "245 East 54th Street",
        city: "New York",
        stateRegion: "NY",
        postalCode: "10022",
        country: "United States",
        latitude: 40.7562,
        longitude: -73.9681,
        timezone: "America/New_York",
        status: SiteStatus.ACTIVE
      },
      {
        name: "Long Island Imaging Center",
        addressLine1: "880 Stewart Avenue",
        city: "Garden City",
        stateRegion: "NY",
        postalCode: "11530",
        country: "United States",
        latitude: 40.7334,
        longitude: -73.6136,
        timezone: "America/New_York",
        status: SiteStatus.ACTIVE
      },
      {
        name: "Santo Domingo Telehealth Office",
        addressLine1: "Avenida Winston Churchill 95",
        city: "Santo Domingo",
        stateRegion: "Distrito Nacional",
        postalCode: "10127",
        country: "Dominican Republic",
        latitude: 18.4727,
        longitude: -69.9389,
        timezone: "America/Santo_Domingo",
        status: SiteStatus.DEGRADED
      }
    ],
    projects: [
      {
        name: "MMG Surgical + Imaging Refresh",
        projectCode: "MMG-Q226-REF",
        status: ProjectInstallationStatus.ACTIVE,
        projectType: ProjectType.REFRESH,
        priority: ProjectPriority.HIGH,
        linkedSiteIndexes: [0, 1],
        primarySiteIndex: 0,
        installationOffsetDays: 60,
        goLiveOffsetDays: 30,
        warrantyEndOffsetDays: -335,
        clientContactName: "Lena Morales",
        clientContactEmail: "lena.morales@midtownmedical.demo",
        clientContactPhone: "+1 212 555 0142",
        internalProjectManager: "Jose Lora",
        leadTechnician: "Daniel Perez",
        salesOwner: "Ariana Ruiz",
        scopeSummary: "Camera refresh, NVR standardization, and managed monitoring handoff for medical imaging and surgical areas.",
        remoteAccessMethod: "Site-to-site VPN + vendor portal references",
        handoffStatus: HandoffStatus.COMPLETE,
        monitoringReady: true,
        vendorSystemsPlanned: "LTS NVR, UniFi switching, VPN handoff docs.",
        externalReference: "NCI-2026-1184",
        internalNotes: "Primary managed-services reference account is already validated.",
        clientFacingNotes: "Monitoring is active for clinical and after-hours coverage."
      },
      {
        name: "MMG Santo Domingo Telehealth Handoff",
        projectCode: "MMG-SD-HANDOFF",
        status: ProjectInstallationStatus.IN_PROGRESS,
        projectType: ProjectType.MANAGED_HANDOFF,
        priority: ProjectPriority.MEDIUM,
        linkedSiteIndexes: [2],
        primarySiteIndex: 2,
        installationOffsetDays: 25,
        goLiveOffsetDays: 7,
        warrantyEndOffsetDays: -360,
        clientContactName: "Paola Jimenez",
        clientContactEmail: "paola.jimenez@midtownmedical.demo",
        clientContactPhone: "+1 809 555 4401",
        internalProjectManager: "Nora Castillo",
        leadTechnician: "Felix Herrera",
        salesOwner: "Ariana Ruiz",
        scopeSummary: "Remote-access handoff, telehealth camera validation, and monitoring readiness uplift.",
        remoteAccessMethod: "Cloud portal + DDNS fallback",
        handoffStatus: HandoffStatus.IN_PROGRESS,
        monitoringReady: false,
        vendorSystemsPlanned: "Reolink cloud relay, TP-Link edge switch monitoring.",
        externalReference: "NCI-2026-1211",
        internalNotes: "Need final ISP static-IP confirmation.",
        clientFacingNotes: "Managed handoff remains in progress pending WAN validation."
      }
    ]
  },
  {
    name: "Brooklyn Logistics Center",
    slug: "brooklyn-logistics-center",
    contactName: "Marcus Flynn",
    contactEmail: "marcus.flynn@brooklynlogistics.demo",
    phone: "+1 718 555 0188",
    status: OrganizationStatus.ACTIVE,
    sites: [
      {
        name: "Red Hook Dispatch Terminal",
        addressLine1: "95 Ferris Street",
        city: "Brooklyn",
        stateRegion: "NY",
        postalCode: "11231",
        country: "United States",
        latitude: 40.6762,
        longitude: -74.0185,
        timezone: "America/New_York",
        status: SiteStatus.ACTIVE
      },
      {
        name: "Newark Cross-Dock",
        addressLine1: "18 Port Street",
        city: "Newark",
        stateRegion: "NJ",
        postalCode: "07114",
        country: "United States",
        latitude: 40.6985,
        longitude: -74.1687,
        timezone: "America/New_York",
        status: SiteStatus.MAINTENANCE
      },
      {
        name: "Miami Freight Coordination Office",
        addressLine1: "1200 NW 72nd Avenue",
        city: "Miami",
        stateRegion: "FL",
        postalCode: "33126",
        country: "United States",
        latitude: 25.7833,
        longitude: -80.3096,
        timezone: "America/New_York",
        status: SiteStatus.ACTIVE
      }
    ],
    projects: [
      {
        name: "BLC Port Security Rollout",
        projectCode: "BLC-PORT-ROLLOUT",
        status: ProjectInstallationStatus.ACTIVE,
        projectType: ProjectType.ROLLOUT,
        priority: ProjectPriority.CRITICAL,
        linkedSiteIndexes: [0, 1],
        primarySiteIndex: 0,
        installationOffsetDays: 75,
        goLiveOffsetDays: 35,
        warrantyEndOffsetDays: -290,
        clientContactName: "Marcus Flynn",
        clientContactEmail: "marcus.flynn@brooklynlogistics.demo",
        clientContactPhone: "+1 718 555 0188",
        internalProjectManager: "Sofia Martinez",
        leadTechnician: "Victor Alvarez",
        salesOwner: "Jose Lora",
        scopeSummary: "Cross-dock surveillance rollout with WAN redundancy and dispatch visibility.",
        remoteAccessMethod: "VPN hub + UniFi controller tunnel",
        handoffStatus: HandoffStatus.COMPLETE,
        monitoringReady: true,
        vendorSystemsPlanned: "UniFi gateways, LTS NVR, RTSP validation later.",
        externalReference: "NCI-2026-1299",
        internalNotes: "Red Hook remains the escalation anchor for after-hours support.",
        clientFacingNotes: "Cross-dock and dispatch sites are live in the managed portal."
      },
      {
        name: "BLC Miami Office Upgrade",
        projectCode: "BLC-MIA-UPGRADE",
        status: ProjectInstallationStatus.IN_PROGRESS,
        projectType: ProjectType.UPGRADE,
        priority: ProjectPriority.MEDIUM,
        linkedSiteIndexes: [2],
        primarySiteIndex: 2,
        installationOffsetDays: 18,
        goLiveOffsetDays: -5,
        warrantyEndOffsetDays: -380,
        clientContactName: "Maya Santos",
        clientContactEmail: "maya.santos@brooklynlogistics.demo",
        clientContactPhone: "+1 305 555 7802",
        internalProjectManager: "Nora Castillo",
        leadTechnician: "Diego Mena",
        salesOwner: "Jose Lora",
        scopeSummary: "Office camera and edge-switch upgrade to align Miami with the logistics standard stack.",
        remoteAccessMethod: "Cloud VPN + vendor portal",
        handoffStatus: HandoffStatus.IN_PROGRESS,
        monitoringReady: false,
        vendorSystemsPlanned: "TP-Link switch telemetry and future PoE budget monitoring.",
        externalReference: "NCI-2026-1330",
        internalNotes: "Awaiting final AP replacement shipment.",
        clientFacingNotes: "Upgrade remains active; remote access is available for support."
      }
    ]
  },
  {
    name: "Long Island Retail Hub",
    slug: "long-island-retail-hub",
    contactName: "Priya Shah",
    contactEmail: "priya.shah@liretailhub.demo",
    phone: "+1 516 555 0121",
    status: OrganizationStatus.ONBOARDING,
    sites: [
      {
        name: "Garden City Flagship",
        addressLine1: "630 Old Country Road",
        city: "Garden City",
        stateRegion: "NY",
        postalCode: "11530",
        country: "United States",
        latitude: 40.7405,
        longitude: -73.6117,
        timezone: "America/New_York",
        status: SiteStatus.ACTIVE
      },
      {
        name: "Melville Fulfillment Floor",
        addressLine1: "50 Broadhollow Road",
        city: "Melville",
        stateRegion: "NY",
        postalCode: "11747",
        country: "United States",
        latitude: 40.7937,
        longitude: -73.4153,
        timezone: "America/New_York",
        status: SiteStatus.DEGRADED
      },
      {
        name: "Queens Overflow Warehouse",
        addressLine1: "24-15 Borden Avenue",
        city: "Long Island City",
        stateRegion: "NY",
        postalCode: "11101",
        country: "United States",
        latitude: 40.7391,
        longitude: -73.9387,
        timezone: "America/New_York",
        status: SiteStatus.ACTIVE
      }
    ],
    projects: [
      {
        name: "LIRH Retail Camera Modernization",
        projectCode: "LIRH-CAM-MOD",
        status: ProjectInstallationStatus.IN_PROGRESS,
        projectType: ProjectType.INSTALLATION,
        priority: ProjectPriority.HIGH,
        linkedSiteIndexes: [0, 1],
        primarySiteIndex: 0,
        installationOffsetDays: 40,
        goLiveOffsetDays: 12,
        warrantyEndOffsetDays: -320,
        clientContactName: "Priya Shah",
        clientContactEmail: "priya.shah@liretailhub.demo",
        clientContactPhone: "+1 516 555 0121",
        internalProjectManager: "Jose Lora",
        leadTechnician: "Melissa Cruz",
        salesOwner: "Ariana Ruiz",
        scopeSummary: "Flagship and fulfillment-floor CCTV modernization with phased managed onboarding.",
        remoteAccessMethod: "Cloud portal + static IP fallback",
        handoffStatus: HandoffStatus.IN_PROGRESS,
        monitoringReady: false,
        vendorSystemsPlanned: "Reolink validation and future topology/rack documentation.",
        externalReference: "NCI-2026-1407",
        internalNotes: "Melville remains partially degraded during phased cutover.",
        clientFacingNotes: "Monitoring cutover continues in stages while old cameras are retired."
      },
      {
        name: "LIRH Queens Managed Handoff",
        projectCode: "LIRH-QUEENS-HO",
        status: ProjectInstallationStatus.PLANNING,
        projectType: ProjectType.MANAGED_HANDOFF,
        priority: ProjectPriority.MEDIUM,
        linkedSiteIndexes: [2],
        primarySiteIndex: 2,
        installationOffsetDays: 5,
        goLiveOffsetDays: -15,
        warrantyEndOffsetDays: -395,
        clientContactName: "Andre Wu",
        clientContactEmail: "andre.wu@liretailhub.demo",
        clientContactPhone: "+1 718 555 0199",
        internalProjectManager: "Sofia Martinez",
        leadTechnician: "Melissa Cruz",
        salesOwner: "Jose Lora",
        scopeSummary: "Warehouse managed handoff planning, access-reference normalization, and monitoring prep.",
        remoteAccessMethod: "Pending VPN handoff",
        handoffStatus: HandoffStatus.NOT_STARTED,
        monitoringReady: false,
        vendorSystemsPlanned: "UniFi gateway, TP-Link edge switch, future SNMP rollout.",
        externalReference: "NCI-2026-1442",
        internalNotes: "Need client credential-vault ownership decision before go-live.",
        clientFacingNotes: "Planning phase only; no production monitoring commitment yet."
      }
    ]
  }
];

const networkSegmentBlueprints = [
  {
    key: "management",
    name: "Management VLAN",
    vlanId: 10,
    thirdOctet: 10,
    purpose: "Management network"
  },
  {
    key: "camera",
    name: "Camera VLAN",
    vlanId: 20,
    thirdOctet: 20,
    purpose: "Camera traffic and recording uplinks"
  },
  {
    key: "staff",
    name: "Staff WiFi VLAN",
    vlanId: 30,
    thirdOctet: 30,
    purpose: "Wireless and office endpoints"
  }
];

const deviceBlueprints = [
  {
    type: DeviceType.ROUTER,
    brand: "Cisco Meraki",
    model: "MX75",
    baseName: "RTR",
    monitoringMode: MonitoringMode.ACTIVE,
    networkSegmentKey: "management"
  },
  {
    type: DeviceType.SWITCH,
    brand: "Ubiquiti",
    model: "USW-Pro-24-PoE",
    baseName: "SW",
    monitoringMode: MonitoringMode.ACTIVE,
    networkSegmentKey: "management"
  },
  {
    type: DeviceType.ACCESS_POINT,
    brand: "Aruba",
    model: "AP22",
    baseName: "AP",
    monitoringMode: MonitoringMode.PASSIVE,
    networkSegmentKey: "management"
  },
  {
    type: DeviceType.NVR,
    brand: "Hanwha",
    model: "QRN-1630S",
    baseName: "NVR",
    monitoringMode: MonitoringMode.ACTIVE,
    networkSegmentKey: "management"
  },
  {
    type: DeviceType.CAMERA,
    brand: "Axis",
    model: "P3265-LVE",
    baseName: "CAM",
    monitoringMode: MonitoringMode.ACTIVE,
    networkSegmentKey: "camera"
  },
  {
    type: DeviceType.CAMERA,
    brand: "Hanwha",
    model: "XNV-8083R",
    baseName: "CAM",
    monitoringMode: MonitoringMode.ACTIVE,
    networkSegmentKey: "camera"
  },
  {
    type: DeviceType.CAMERA,
    brand: "Hikvision",
    model: "DS-2CD2143G2",
    baseName: "CAM",
    monitoringMode: MonitoringMode.MANUAL,
    networkSegmentKey: "camera"
  }
];

const switchCapacityProfiles = [
  {
    switchRole: "ACCESS",
    portCount: 24,
    usedPortCount: 8,
    poeBudgetWatts: 370,
    poeUsedWatts: 46
  },
  {
    switchRole: "DISTRIBUTION",
    portCount: 24,
    usedPortCount: 20,
    poeBudgetWatts: 62,
    poeUsedWatts: null
  },
  {
    switchRole: "ACCESS",
    portCount: 24,
    usedPortCount: 26,
    poeBudgetWatts: 42,
    poeUsedWatts: 48
  }
];

const siteHealthPatterns = [
  [
    HealthStatus.HEALTHY,
    HealthStatus.HEALTHY,
    HealthStatus.HEALTHY,
    HealthStatus.HEALTHY,
    HealthStatus.WARNING,
    HealthStatus.CRITICAL,
    HealthStatus.UNKNOWN
  ],
  [
    HealthStatus.HEALTHY,
    HealthStatus.HEALTHY,
    HealthStatus.WARNING,
    HealthStatus.WARNING,
    HealthStatus.HEALTHY,
    HealthStatus.HEALTHY,
    HealthStatus.UNKNOWN
  ],
  [
    HealthStatus.HEALTHY,
    HealthStatus.CRITICAL,
    HealthStatus.WARNING,
    HealthStatus.HEALTHY,
    HealthStatus.WARNING,
    HealthStatus.CRITICAL,
    HealthStatus.UNKNOWN
  ],
  [
    HealthStatus.HEALTHY,
    HealthStatus.HEALTHY,
    HealthStatus.HEALTHY,
    HealthStatus.HEALTHY,
    HealthStatus.HEALTHY,
    HealthStatus.WARNING,
    HealthStatus.UNKNOWN
  ],
  [
    HealthStatus.WARNING,
    HealthStatus.HEALTHY,
    HealthStatus.WARNING,
    HealthStatus.HEALTHY,
    HealthStatus.CRITICAL,
    HealthStatus.HEALTHY,
    HealthStatus.UNKNOWN
  ],
  [
    HealthStatus.HEALTHY,
    HealthStatus.HEALTHY,
    HealthStatus.WARNING,
    HealthStatus.HEALTHY,
    HealthStatus.HEALTHY,
    HealthStatus.HEALTHY,
    HealthStatus.UNKNOWN
  ]
];

function hoursAgo(hours) {
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

function daysAgo(days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

function slugToCode(value) {
  return value
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .split("-")
    .map((segment) => segment.slice(0, 3))
    .join("");
}

function deviceStatusFromHealth(status) {
  switch (status) {
    case HealthStatus.HEALTHY:
      return DeviceStatus.ONLINE;
    case HealthStatus.WARNING:
      return DeviceStatus.DEGRADED;
    case HealthStatus.CRITICAL:
      return DeviceStatus.OFFLINE;
    case HealthStatus.UNKNOWN:
    default:
      return DeviceStatus.UNKNOWN;
  }
}

function healthTimelineFor(status) {
  switch (status) {
    case HealthStatus.HEALTHY:
      return [
        { status: HealthStatus.UNKNOWN, offsetHours: 28, checkType: HealthCheckType.CONNECTIVITY, latencyMs: null, message: "Historical telemetry incomplete before device enrollment." },
        { status: HealthStatus.HEALTHY, offsetHours: 12, checkType: HealthCheckType.CONNECTIVITY, latencyMs: 32, message: "Connectivity stable during overnight monitoring window." },
        { status: HealthStatus.HEALTHY, offsetHours: 4, checkType: HealthCheckType.CONNECTIVITY, latencyMs: 24, message: "Device responded within normal latency thresholds." },
        { status: HealthStatus.HEALTHY, offsetHours: 0.5, checkType: HealthCheckType.CONNECTIVITY, latencyMs: 18, message: "Latest health check completed successfully." }
      ];
    case HealthStatus.WARNING:
      return [
        { status: HealthStatus.HEALTHY, offsetHours: 24, checkType: HealthCheckType.CONNECTIVITY, latencyMs: 41, message: "Connectivity stable in previous cycle." },
        { status: HealthStatus.HEALTHY, offsetHours: 10, checkType: HealthCheckType.CONNECTIVITY, latencyMs: 48, message: "Device remained reachable with nominal latency." },
        { status: HealthStatus.WARNING, offsetHours: 3, checkType: HealthCheckType.MANUAL, latencyMs: 160, message: "Latency spiked above preferred threshold during manual verification." },
        { status: HealthStatus.WARNING, offsetHours: 0.7, checkType: HealthCheckType.CONNECTIVITY, latencyMs: 185, message: "Device reachable, but latency remains elevated." }
      ];
    case HealthStatus.CRITICAL:
      return [
        { status: HealthStatus.HEALTHY, offsetHours: 20, checkType: HealthCheckType.CONNECTIVITY, latencyMs: 36, message: "Normal connectivity before degradation began." },
        { status: HealthStatus.WARNING, offsetHours: 8, checkType: HealthCheckType.MANUAL, latencyMs: 240, message: "Intermittent response observed during manual review." },
        { status: HealthStatus.CRITICAL, offsetHours: 2, checkType: HealthCheckType.CONNECTIVITY, latencyMs: 960, message: "Device failed connectivity threshold during scheduled health check." },
        { status: HealthStatus.CRITICAL, offsetHours: 0.3, checkType: HealthCheckType.CONNECTIVITY, latencyMs: 1100, message: "Device remains unreachable or severely degraded." }
      ];
    case HealthStatus.UNKNOWN:
    default:
      return [
        { status: HealthStatus.UNKNOWN, offsetHours: 18, checkType: HealthCheckType.CONNECTIVITY, latencyMs: null, message: "No reliable telemetry available during the previous window." },
        { status: HealthStatus.UNKNOWN, offsetHours: 6, checkType: HealthCheckType.MANUAL, latencyMs: null, message: "Manual verification was inconclusive." },
        { status: HealthStatus.UNKNOWN, offsetHours: 1.5, checkType: HealthCheckType.CONNECTIVITY, latencyMs: null, message: "Telemetry has not resumed from the device." }
      ];
  }
}

function alertTemplateFor(status, deviceType, siteName) {
  switch (status) {
    case HealthStatus.CRITICAL:
      return {
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.OPEN,
        title: `${deviceType} connectivity lost`,
        message: `Critical health failure detected for ${deviceType.toLowerCase()} coverage at ${siteName}. Immediate review is required.`
      };
    case HealthStatus.WARNING:
      return {
        severity: AlertSeverity.HIGH,
        status: AlertStatus.ACKNOWLEDGED,
        title: `${deviceType} latency elevated`,
        message: `Warning-level latency has been recorded for ${deviceType.toLowerCase()} monitoring at ${siteName}.`
      };
    case HealthStatus.UNKNOWN:
      return {
        severity: AlertSeverity.MEDIUM,
        status: AlertStatus.OPEN,
        title: `${deviceType} telemetry unavailable`,
        message: `Telemetry is currently unavailable for ${deviceType.toLowerCase()} monitoring at ${siteName}.`
      };
    case HealthStatus.HEALTHY:
    default:
      return {
        severity: AlertSeverity.LOW,
        status: AlertStatus.RESOLVED,
        title: `${deviceType} health restored`,
        message: `${deviceType} monitoring returned to normal operating thresholds at ${siteName}.`
      };
  }
}

async function createUsers(passwordHash, organizationsBySlug) {
  const users = [
    {
      name: "NCI Super Admin",
      email: "super.admin@networkconnectit.demo",
      role: Role.SUPER_ADMIN,
      organizationId: null
    },
    {
      name: "NCI Internal Admin",
      email: "internal.admin@networkconnectit.demo",
      role: Role.INTERNAL_ADMIN,
      organizationId: null
    },
    {
      name: "Midtown Client Admin",
      email: "midtown.admin@networkconnectit.demo",
      role: Role.CLIENT_ADMIN,
      organizationId: organizationsBySlug["midtown-medical-group"].id
    },
    {
      name: "Brooklyn Client Admin",
      email: "brooklyn.admin@networkconnectit.demo",
      role: Role.CLIENT_ADMIN,
      organizationId: organizationsBySlug["brooklyn-logistics-center"].id
    },
    {
      name: "Long Island Client Admin",
      email: "longisland.admin@networkconnectit.demo",
      role: Role.CLIENT_ADMIN,
      organizationId: organizationsBySlug["long-island-retail-hub"].id
    },
    {
      name: "Midtown Viewer",
      email: "midtown.viewer@networkconnectit.demo",
      role: Role.VIEWER,
      organizationId: organizationsBySlug["midtown-medical-group"].id
    },
    {
      name: "Brooklyn Viewer",
      email: "brooklyn.viewer@networkconnectit.demo",
      role: Role.VIEWER,
      organizationId: organizationsBySlug["brooklyn-logistics-center"].id
    },
    {
      name: "Long Island Viewer",
      email: "longisland.viewer@networkconnectit.demo",
      role: Role.VIEWER,
      organizationId: organizationsBySlug["long-island-retail-hub"].id
    }
  ];

  for (const user of users) {
    await prisma.user.create({
      data: {
        ...user,
        passwordHash
      }
    });
  }

  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      organizationId: true
    }
  });
}

async function main() {
  const passwordHash = await hash(DEMO_PASSWORD, 12);

  await prisma.deviceLink.deleteMany();
  await prisma.nvrChannelAssignment.deleteMany();
  await prisma.accessReference.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.healthCheck.deleteMany();
  await prisma.device.deleteMany();
  await prisma.networkSegment.deleteMany();
  await prisma.projectSite.deleteMany();
  await prisma.projectInstallation.deleteMany();
  await prisma.site.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const organizationsBySlug = {};
  const usersByRoleAndOrg = {};

  for (const organizationSeed of organizationsSeed) {
    const organization = await prisma.organization.create({
      data: {
        name: organizationSeed.name,
        slug: organizationSeed.slug,
        contactName: organizationSeed.contactName,
        contactEmail: organizationSeed.contactEmail,
        phone: organizationSeed.phone,
        status: organizationSeed.status
      }
    });

    organizationsBySlug[organization.slug] = organization;

    const siteRecords = [];
    const segmentsBySiteId = {};
    const projectBySiteIndex = {};
    const devicesBySiteId = {};

    for (const siteSeed of organizationSeed.sites) {
      const site = await prisma.site.create({
        data: {
          organizationId: organization.id,
          name: siteSeed.name,
          addressLine1: siteSeed.addressLine1,
          city: siteSeed.city,
          stateRegion: siteSeed.stateRegion,
          postalCode: siteSeed.postalCode,
          country: siteSeed.country,
          latitude: siteSeed.latitude,
          longitude: siteSeed.longitude,
          timezone: siteSeed.timezone,
          status: siteSeed.status,
          notes: `${organization.name} deployment for ${siteSeed.name}.`
        }
      });

      siteRecords.push(site);

      const siteCode = slugToCode(site.name);
      const segmentMap = {};

      for (const segmentBlueprint of networkSegmentBlueprints) {
        const segment = await prisma.networkSegment.create({
          data: {
            organizationId: organization.id,
            siteId: site.id,
            name: segmentBlueprint.name,
            vlanId: segmentBlueprint.vlanId,
            subnetCidr: `10.${siteRecords.length + 20}.${segmentBlueprint.thirdOctet}.0/24`,
            gatewayIp: `10.${siteRecords.length + 20}.${segmentBlueprint.thirdOctet}.1`,
            purpose: segmentBlueprint.purpose,
            notes: `${siteCode} ${segmentBlueprint.name.toLowerCase()} for ${organization.name}.`
          }
        });

        segmentMap[segmentBlueprint.key] = segment;
      }

      segmentsBySiteId[site.id] = segmentMap;
    }

    const projectRecords = [];

    for (const projectSeed of organizationSeed.projects) {
      const linkedSites = projectSeed.linkedSiteIndexes.map(
        (index) => siteRecords[index]
      );
      const primarySite = siteRecords[projectSeed.primarySiteIndex];

      const project = await prisma.projectInstallation.create({
        data: {
          organizationId: organization.id,
          primarySiteId: primarySite?.id ?? null,
          name: projectSeed.name,
          projectCode: projectSeed.projectCode,
          status: projectSeed.status,
          projectType: projectSeed.projectType,
          priority: projectSeed.priority,
          installationDate: daysAgo(projectSeed.installationOffsetDays),
          goLiveDate:
            projectSeed.goLiveOffsetDays >= 0
              ? daysAgo(projectSeed.goLiveOffsetDays)
              : daysFromNow(Math.abs(projectSeed.goLiveOffsetDays)),
          warrantyStartAt: daysAgo(projectSeed.installationOffsetDays),
          warrantyEndAt: daysFromNow(Math.abs(projectSeed.warrantyEndOffsetDays)),
          clientContactName: projectSeed.clientContactName,
          clientContactEmail: projectSeed.clientContactEmail,
          clientContactPhone: projectSeed.clientContactPhone,
          internalProjectManager: projectSeed.internalProjectManager,
          leadTechnician: projectSeed.leadTechnician,
          salesOwner: projectSeed.salesOwner,
          scopeSummary: projectSeed.scopeSummary,
          remoteAccessMethod: projectSeed.remoteAccessMethod,
          handoffStatus: projectSeed.handoffStatus,
          monitoringReady: projectSeed.monitoringReady,
          vendorSystemsPlanned: projectSeed.vendorSystemsPlanned,
          externalReference: projectSeed.externalReference,
          internalNotes: projectSeed.internalNotes,
          clientFacingNotes: projectSeed.clientFacingNotes
        }
      });

      projectRecords.push(project);

      for (const siteIndex of projectSeed.linkedSiteIndexes) {
        const site = siteRecords[siteIndex];
        projectBySiteIndex[siteIndex] = project;

        await prisma.projectSite.create({
          data: {
            organizationId: organization.id,
            projectInstallationId: project.id,
            siteId: site.id,
            roleOrPhase:
              siteIndex === projectSeed.primarySiteIndex
                ? "Primary deployment site"
                : "Linked rollout site",
            notes: `${project.name} is responsible for the current infrastructure baseline at ${site.name}.`
          }
        });
      }

      await prisma.accessReference.create({
        data: {
          organizationId: organization.id,
          projectInstallationId: project.id,
          name: `${project.name} deployment documentation`,
          accessType: AccessType.DOCUMENTATION,
          vaultProvider: "1Password",
          vaultPath: `NetworkConnectIT/${organization.name}/${project.projectCode}/Documentation`,
          owner: projectSeed.internalProjectManager,
          remoteAccessMethod: projectSeed.remoteAccessMethod,
          notes: "Reference pack includes turnover docs, controller URLs, and escalation runbook.",
          lastValidatedAt: daysAgo(2)
        }
      });
    }

    for (const [siteIndex, site] of siteRecords.entries()) {
      const project = projectBySiteIndex[siteIndex];
      const statusPattern = siteHealthPatterns[siteIndex % siteHealthPatterns.length];
      const siteCode = slugToCode(site.name);
      const siteSegments = segmentsBySiteId[site.id];
      const createdDevices = [];

      for (const [deviceIndex, blueprint] of deviceBlueprints.entries()) {
        const healthStatus = statusPattern[deviceIndex % statusPattern.length];
        const deviceName = `${blueprint.baseName}-${siteCode}-${String(deviceIndex + 1).padStart(2, "0")}`;
        const timeline = healthTimelineFor(healthStatus);
        const latestHealth = timeline[timeline.length - 1];
        const segment = siteSegments[blueprint.networkSegmentKey];
        const thirdOctet = segment.subnetCidr.split(".")[2];
        const switchCapacityProfile =
          switchCapacityProfiles[siteIndex % switchCapacityProfiles.length];
        const cameraIndex =
          blueprint.type === DeviceType.CAMERA ? Math.max(deviceIndex - 4, 0) : null;
        const estimatedCameraWatts =
          cameraIndex === null ? null : 11.4 + cameraIndex * 1.3;
        const device = await prisma.device.create({
          data: {
            organizationId: organization.id,
            siteId: site.id,
            projectInstallationId: project?.id ?? null,
            networkSegmentId: segment.id,
            name: deviceName,
            hostname: `${deviceName.toLowerCase()}.${organization.slug}.demo`,
            vendorExternalId: `${organization.slug}-${siteCode.toLowerCase()}-${deviceIndex + 1}`,
            type: blueprint.type,
            brand: blueprint.brand,
            model: blueprint.model,
            firmwareVersion: `v${siteIndex + 1}.${deviceIndex + 3}.2`,
            ipAddress: `10.${siteIndex + 21}.${thirdOctet}.${deviceIndex + 20}`,
            macAddress: `00:16:3E:${(siteIndex + 16).toString(16).padStart(2, "0").toUpperCase()}:${(deviceIndex + 32).toString(16).padStart(2, "0").toUpperCase()}:${(deviceIndex + 48).toString(16).padStart(2, "0").toUpperCase()}`,
            serialNumber: `${organization.slug.toUpperCase().slice(0, 6)}-${siteCode}-${String(deviceIndex + 1).padStart(3, "0")}`,
            switchRole:
              blueprint.type === DeviceType.SWITCH
                ? switchCapacityProfile.switchRole
                : null,
            portCount:
              blueprint.type === DeviceType.SWITCH
                ? switchCapacityProfile.portCount
                : null,
            usedPortCount:
              blueprint.type === DeviceType.SWITCH
                ? switchCapacityProfile.usedPortCount
                : null,
            poeBudgetWatts:
              blueprint.type === DeviceType.SWITCH
                ? switchCapacityProfile.poeBudgetWatts
                : null,
            poeUsedWatts:
              blueprint.type === DeviceType.SWITCH
                ? switchCapacityProfile.poeUsedWatts
                : null,
            poeRequired:
              blueprint.type === DeviceType.CAMERA ||
              blueprint.type === DeviceType.ACCESS_POINT
                ? true
                : null,
            estimatedPoeWatts:
              blueprint.type === DeviceType.ACCESS_POINT
                ? 15.5
                : blueprint.type === DeviceType.CAMERA
                  ? estimatedCameraWatts
                  : null,
            status: deviceStatusFromHealth(healthStatus),
            monitoringMode: blueprint.monitoringMode,
            installedAt: daysAgo((siteIndex + 1) * 15 + deviceIndex),
            lastSeenAt:
              healthStatus === HealthStatus.UNKNOWN
                ? null
                : hoursAgo(latestHealth.offsetHours),
            notes: `${blueprint.brand} ${blueprint.model} deployed at ${site.name} under ${project?.name ?? "general inventory"}.`
          }
        });

        createdDevices.push(device);

        for (const [timelineIndex, health] of timeline.entries()) {
          await prisma.healthCheck.create({
            data: {
              deviceId: device.id,
              checkType: health.checkType,
              status: health.status,
              latencyMs: health.latencyMs,
              message: health.message,
              checkedAt: hoursAgo(health.offsetHours + siteIndex + timelineIndex * 0.2)
            }
          });
        }

        const alertTemplate = alertTemplateFor(healthStatus, blueprint.type, site.name);
        await prisma.alert.create({
          data: {
            organizationId: organization.id,
            siteId: site.id,
            deviceId: device.id,
            title: alertTemplate.title,
            message: alertTemplate.message,
            severity: alertTemplate.severity,
            status: alertTemplate.status,
            triggeredAt: hoursAgo(latestHealth.offsetHours + 0.1),
            createdAt: hoursAgo(latestHealth.offsetHours + 0.1),
            acknowledgedAt:
              alertTemplate.status !== AlertStatus.OPEN
                ? hoursAgo(latestHealth.offsetHours * 0.8 + 0.05)
                : null,
            resolvedAt:
              alertTemplate.status === AlertStatus.RESOLVED
                ? hoursAgo(Math.max(latestHealth.offsetHours * 0.4, 0.02))
                : null
          }
        });
      }

      devicesBySiteId[site.id] = createdDevices;

      const router = createdDevices.find((device) => device.type === DeviceType.ROUTER);
      const switchDevice = createdDevices.find((device) => device.type === DeviceType.SWITCH);
      const nvr = createdDevices.find((device) => device.type === DeviceType.NVR);
      const accessPoint = createdDevices.find(
        (device) => device.type === DeviceType.ACCESS_POINT
      );
      const cameras = createdDevices.filter((device) => device.type === DeviceType.CAMERA);

      if (router && switchDevice) {
        await prisma.deviceLink.create({
          data: {
            organizationId: organization.id,
            siteId: site.id,
            sourceDeviceId: router.id,
            targetDeviceId: switchDevice.id,
            linkType: DeviceLinkType.UPLINK,
            sourcePort: "LAN1",
            targetPort: "Gi1/0/24",
            notes: "Primary WAN handoff into the PoE distribution switch."
          }
        });
      }

      if (switchDevice && accessPoint) {
        await prisma.deviceLink.create({
          data: {
            organizationId: organization.id,
            siteId: site.id,
            sourceDeviceId: switchDevice.id,
            targetDeviceId: accessPoint.id,
            linkType: DeviceLinkType.DOWNSTREAM,
            sourcePort: "Gi1/0/08",
            targetPort: "eth0",
            poeProvided: true,
            notes: "Primary AP uplink fed by PoE access layer."
          }
        });
      }

      if (switchDevice && nvr) {
        await prisma.deviceLink.create({
          data: {
            organizationId: organization.id,
            siteId: site.id,
            sourceDeviceId: switchDevice.id,
            targetDeviceId: nvr.id,
            linkType: DeviceLinkType.RECORDING,
            sourcePort: "Gi1/0/12",
            targetPort: "LAN1",
            notes: "Recording uplink from camera access switch to NVR."
          }
        });
      }

      if (switchDevice && nvr) {
        for (const [cameraIndex, camera] of cameras.entries()) {
          await prisma.nvrChannelAssignment.create({
            data: {
              organizationId: organization.id,
              siteId: site.id,
              nvrDeviceId: nvr.id,
              cameraDeviceId: camera.id,
              channelNumber: cameraIndex + 1,
              recordingEnabled: camera.status !== DeviceStatus.UNKNOWN,
              notes: `Mapped for ${site.name} surveillance channel ${cameraIndex + 1}.`
            }
          });

          await prisma.deviceLink.create({
            data: {
              organizationId: organization.id,
              siteId: site.id,
              sourceDeviceId: switchDevice.id,
              targetDeviceId: camera.id,
              linkType: DeviceLinkType.POE_SUPPLY,
              sourcePort: `Gi1/0/${String(cameraIndex + 1).padStart(2, "0")}`,
              targetPort: "eth0",
              poeProvided: true,
              notes: `Camera PoE feed for ${camera.name}.`
            }
          });
        }
      }

      if (project) {
        await prisma.accessReference.create({
          data: {
            organizationId: organization.id,
            siteId: site.id,
            projectInstallationId: project.id,
            name: `${site.name} remote access`,
            accessType: AccessType.VPN,
            vaultProvider: "1Password",
            vaultPath: `NetworkConnectIT/${organization.name}/${site.name}/VPN`,
            owner: project.internalProjectManager ?? "NCI Operations",
            remoteAccessMethod: project.remoteAccessMethod,
            notes: "Primary remote access reference for site support. No passwords stored here.",
            lastValidatedAt: daysAgo(siteIndex + 1)
          }
        });

        if (router) {
          await prisma.accessReference.create({
            data: {
              organizationId: organization.id,
              siteId: site.id,
              projectInstallationId: project.id,
              deviceId: router.id,
              name: `${router.name} admin console`,
              accessType: AccessType.WEB_UI,
              vaultProvider: "1Password",
              vaultPath: `NetworkConnectIT/${organization.name}/${site.name}/${router.name}`,
              owner: "NOC",
              remoteAccessMethod: "VPN-only admin UI",
              notes: "Router management reference with MFA enforced through the customer VPN.",
              lastValidatedAt: daysAgo(1)
            }
          });
        }

        if (nvr) {
          await prisma.accessReference.create({
            data: {
              organizationId: organization.id,
              siteId: site.id,
              projectInstallationId: project.id,
              deviceId: nvr.id,
              name: `${nvr.name} recorder portal`,
              accessType: AccessType.VENDOR_PORTAL,
              vaultProvider: "1Password",
              vaultPath: `NetworkConnectIT/${organization.name}/${site.name}/${nvr.name}`,
              owner: "Video Ops",
              remoteAccessMethod: "Vendor recorder portal and on-site web UI",
              notes: "Use the channel map in Command Center before remote playback testing.",
              lastValidatedAt: daysAgo(3)
            }
          });
        }
      }
    }
  }

  const users = await createUsers(passwordHash, organizationsBySlug);
  const superAdmin = users.find((user) => user.role === Role.SUPER_ADMIN);
  const internalAdmin = users.find((user) => user.role === Role.INTERNAL_ADMIN);

  for (const user of users) {
    usersByRoleAndOrg[`${user.role}:${user.organizationId ?? "global"}`] = user.id;
  }

  await prisma.alert.updateMany({
    data: {
      createdById: superAdmin?.id ?? null
    }
  });

  const alertTargets = await prisma.alert.findMany({
    where: {
      status: {
        in: [AlertStatus.ACKNOWLEDGED, AlertStatus.RESOLVED]
      }
    },
    select: {
      id: true,
      status: true,
      organizationId: true
    }
  });

  for (const alert of alertTargets) {
    const actorId =
      alert.organizationId === organizationsBySlug["midtown-medical-group"].id
        ? usersByRoleAndOrg[`CLIENT_ADMIN:${alert.organizationId}`]
        : internalAdmin?.id;

    await prisma.alert.update({
      where: {
        id: alert.id
      },
      data: {
        resolvedById: alert.status === AlertStatus.RESOLVED ? actorId ?? null : null
      }
    });
  }

  console.log("Seed complete.");
  console.log(`Demo password: ${DEMO_PASSWORD}`);
  console.log("Demo users:");
  console.log("- super.admin@networkconnectit.demo (SUPER_ADMIN)");
  console.log("- internal.admin@networkconnectit.demo (INTERNAL_ADMIN)");
  console.log("- midtown.admin@networkconnectit.demo (CLIENT_ADMIN)");
  console.log("- brooklyn.admin@networkconnectit.demo (CLIENT_ADMIN)");
  console.log("- longisland.admin@networkconnectit.demo (CLIENT_ADMIN)");
  console.log("- midtown.viewer@networkconnectit.demo (VIEWER)");
  console.log("- brooklyn.viewer@networkconnectit.demo (VIEWER)");
  console.log("- longisland.viewer@networkconnectit.demo (VIEWER)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
