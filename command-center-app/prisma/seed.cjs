const { PrismaClient, Role, OrganizationStatus, SiteStatus, DeviceType, DeviceStatus, MonitoringMode, HealthStatus, HealthCheckType, AlertSeverity, AlertStatus } = require("@prisma/client");
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
    ]
  }
];

const deviceBlueprints = [
  {
    type: DeviceType.ROUTER,
    brand: "Cisco Meraki",
    model: "MX75",
    baseName: "RTR",
    monitoringMode: MonitoringMode.ACTIVE
  },
  {
    type: DeviceType.SWITCH,
    brand: "Ubiquiti",
    model: "USW-Pro-24-PoE",
    baseName: "SW",
    monitoringMode: MonitoringMode.ACTIVE
  },
  {
    type: DeviceType.ACCESS_POINT,
    brand: "Aruba",
    model: "AP22",
    baseName: "AP",
    monitoringMode: MonitoringMode.PASSIVE
  },
  {
    type: DeviceType.NVR,
    brand: "Hanwha",
    model: "QRN-1630S",
    baseName: "NVR",
    monitoringMode: MonitoringMode.ACTIVE
  },
  {
    type: DeviceType.CAMERA,
    brand: "Axis",
    model: "P3265-LVE",
    baseName: "CAM",
    monitoringMode: MonitoringMode.ACTIVE
  },
  {
    type: DeviceType.CAMERA,
    brand: "Hanwha",
    model: "XNV-8083R",
    baseName: "CAM",
    monitoringMode: MonitoringMode.ACTIVE
  },
  {
    type: DeviceType.CAMERA,
    brand: "Hikvision",
    model: "DS-2CD2143G2",
    baseName: "CAM",
    monitoringMode: MonitoringMode.MANUAL
  }
];

const siteHealthPatterns = [
  [HealthStatus.HEALTHY, HealthStatus.HEALTHY, HealthStatus.HEALTHY, HealthStatus.HEALTHY, HealthStatus.WARNING, HealthStatus.CRITICAL, HealthStatus.UNKNOWN],
  [HealthStatus.HEALTHY, HealthStatus.HEALTHY, HealthStatus.WARNING, HealthStatus.WARNING, HealthStatus.HEALTHY, HealthStatus.HEALTHY, HealthStatus.UNKNOWN],
  [HealthStatus.HEALTHY, HealthStatus.CRITICAL, HealthStatus.WARNING, HealthStatus.HEALTHY, HealthStatus.WARNING, HealthStatus.CRITICAL, HealthStatus.UNKNOWN],
  [HealthStatus.HEALTHY, HealthStatus.HEALTHY, HealthStatus.HEALTHY, HealthStatus.HEALTHY, HealthStatus.HEALTHY, HealthStatus.WARNING, HealthStatus.UNKNOWN],
  [HealthStatus.WARNING, HealthStatus.HEALTHY, HealthStatus.WARNING, HealthStatus.HEALTHY, HealthStatus.CRITICAL, HealthStatus.HEALTHY, HealthStatus.UNKNOWN],
  [HealthStatus.HEALTHY, HealthStatus.HEALTHY, HealthStatus.WARNING, HealthStatus.HEALTHY, HealthStatus.HEALTHY, HealthStatus.HEALTHY, HealthStatus.UNKNOWN]
];

function hoursAgo(hours) {
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
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
      return DeviceStatus.UNKNOWN;
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

  await prisma.alert.deleteMany();
  await prisma.healthCheck.deleteMany();
  await prisma.device.deleteMany();
  await prisma.site.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const organizationsBySlug = {};

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

    for (const [siteIndex, siteSeed] of organizationSeed.sites.entries()) {
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

      const statusPattern = siteHealthPatterns[siteIndex % siteHealthPatterns.length];

      for (const [deviceIndex, blueprint] of deviceBlueprints.entries()) {
        const healthStatus = statusPattern[deviceIndex % statusPattern.length];
        const code = slugToCode(site.name);
        const deviceName = `${blueprint.baseName}-${code}-${String(deviceIndex + 1).padStart(2, "0")}`;
        const timeline = healthTimelineFor(healthStatus);
        const latestHealth = timeline[timeline.length - 1];
        const device = await prisma.device.create({
          data: {
            organizationId: organization.id,
            siteId: site.id,
            name: deviceName,
            type: blueprint.type,
            brand: blueprint.brand,
            model: blueprint.model,
            ipAddress: `10.${siteIndex + 20}.${deviceIndex + 10}.${deviceIndex + 20}`,
            macAddress: `00:16:3E:${(siteIndex + 16).toString(16).padStart(2, "0").toUpperCase()}:${(deviceIndex + 32).toString(16).padStart(2, "0").toUpperCase()}:${(deviceIndex + 48).toString(16).padStart(2, "0").toUpperCase()}`,
            serialNumber: `${organization.slug.toUpperCase().slice(0, 6)}-${code}-${String(deviceIndex + 1).padStart(3, "0")}`,
            status: deviceStatusFromHealth(healthStatus),
            monitoringMode: blueprint.monitoringMode,
            lastSeenAt: healthStatus === HealthStatus.UNKNOWN ? null : hoursAgo(latestHealth.offsetHours),
            notes: `${blueprint.brand} ${blueprint.model} deployed at ${site.name}.`
          }
        });

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
            acknowledgedAt: alertTemplate.status !== AlertStatus.OPEN ? hoursAgo(latestHealth.offsetHours * 0.8 + 0.05) : null,
            resolvedAt: alertTemplate.status === AlertStatus.RESOLVED ? hoursAgo(Math.max(latestHealth.offsetHours * 0.4, 0.02)) : null
          }
        });
      }
    }
  }

  const users = await createUsers(passwordHash, organizationsBySlug);
  const superAdmin = users.find((user) => user.role === Role.SUPER_ADMIN);
  const internalAdmin = users.find((user) => user.role === Role.INTERNAL_ADMIN);

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
        ? users.find(
            (user) =>
              user.role === Role.CLIENT_ADMIN &&
              user.organizationId === alert.organizationId
          )?.id
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
