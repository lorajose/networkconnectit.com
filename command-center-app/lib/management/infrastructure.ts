import { DeviceType } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  getScopedRecordWhere,
  type TenantUser
} from "@/lib/management/tenant";
import { getProjectOptions } from "@/lib/management/projects";

export type SiteDeviceOption = {
  id: string;
  name: string;
  type: DeviceType;
  brand: string | null;
  model: string | null;
};

export async function getNetworkSegmentOptions(user: TenantUser, siteId: string) {
  return prisma.networkSegment.findMany({
    where: {
      siteId,
      ...getScopedRecordWhere(user)
    },
    orderBy: [
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
      subnetCidr: true
    }
  });
}

export async function getSiteDeviceOptions(
  user: TenantUser,
  siteId: string
): Promise<SiteDeviceOption[]> {
  return prisma.device.findMany({
    where: {
      siteId,
      ...getScopedRecordWhere(user)
    },
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
      model: true
    }
  });
}

export async function getSiteInfrastructureDetail(user: TenantUser, siteId: string) {
  const siteRecord = await prisma.site.findFirst({
    where: {
      id: siteId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true
    }
  });

  if (!siteRecord) {
    return null;
  }

  const [projects, accessReferences, networkSegments, nvrAssignments, deviceLinks] =
    await Promise.all([
      prisma.projectSite.findMany({
        where: {
          siteId,
          organizationId: siteRecord.organizationId
        },
        orderBy: {
          projectInstallation: {
            name: "asc"
          }
        },
        select: {
          id: true,
          roleOrPhase: true,
          notes: true,
          createdAt: true,
          projectInstallation: {
            select: {
              id: true,
              name: true,
              status: true,
              projectType: true,
              monitoringReady: true
            }
          }
        }
      }),
      prisma.accessReference.findMany({
        where: {
          siteId,
          organizationId: siteRecord.organizationId
        },
        orderBy: {
          name: "asc"
        },
        select: {
          id: true,
          name: true,
          accessType: true,
          vaultProvider: true,
          vaultPath: true,
          owner: true,
          remoteAccessMethod: true,
          lastValidatedAt: true,
          notes: true,
          projectInstallation: {
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
      prisma.networkSegment.findMany({
        where: {
          siteId,
          organizationId: siteRecord.organizationId
        },
        orderBy: [
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
          updatedAt: true,
          _count: {
            select: {
              devices: true
            }
          }
        }
      }),
      prisma.nvrChannelAssignment.findMany({
        where: {
          siteId,
          organizationId: siteRecord.organizationId
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
          updatedAt: true,
          nvrDevice: {
            select: {
              id: true,
              name: true,
              brand: true,
              model: true
            }
          },
          cameraDevice: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
              ipAddress: true
            }
          }
        }
      }),
      prisma.deviceLink.findMany({
        where: {
          siteId,
          organizationId: siteRecord.organizationId
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
          updatedAt: true,
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
      })
    ]);

  return {
    organizationId: siteRecord.organizationId,
    projects,
    accessReferences,
    networkSegments,
    nvrAssignments,
    deviceLinks
  };
}

export async function getSiteInfrastructureOptions(user: TenantUser, siteId: string) {
  const site = await prisma.site.findFirst({
    where: {
      id: siteId,
      ...getScopedRecordWhere(user)
    },
    select: {
      organizationId: true
    }
  });

  if (!site) {
    return null;
  }

  const [devices, projects] = await Promise.all([
    getSiteDeviceOptions(user, siteId),
    getProjectOptions(user, site.organizationId)
  ]);

  return {
    organizationId: site.organizationId,
    devices,
    nvrDevices: devices.filter((device) => device.type === "NVR"),
    cameraDevices: devices.filter((device) => device.type === "CAMERA"),
    projects
  };
}

export async function getDeviceInfrastructureDetail(user: TenantUser, deviceId: string) {
  const device = await prisma.device.findFirst({
    where: {
      id: deviceId,
      ...getScopedRecordWhere(user)
    },
    select: {
      id: true,
      organizationId: true,
      siteId: true
    }
  });

  if (!device) {
    return null;
  }

  const [accessReferences, nvrAssignmentsAsNvr, nvrAssignmentsAsCamera, outgoingLinks, incomingLinks] =
    await Promise.all([
      prisma.accessReference.findMany({
        where: {
          deviceId,
          organizationId: device.organizationId
        },
        orderBy: {
          name: "asc"
        },
        select: {
          id: true,
          name: true,
          accessType: true,
          vaultProvider: true,
          vaultPath: true,
          owner: true,
          remoteAccessMethod: true,
          lastValidatedAt: true,
          notes: true,
          projectInstallation: {
            select: {
              id: true,
              name: true
            }
          },
          site: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.nvrChannelAssignment.findMany({
        where: {
          nvrDeviceId: deviceId,
          organizationId: device.organizationId
        },
        orderBy: {
          channelNumber: "asc"
        },
        select: {
          id: true,
          channelNumber: true,
          recordingEnabled: true,
          notes: true,
          updatedAt: true,
          cameraDevice: {
            select: {
              id: true,
              name: true,
              status: true,
              ipAddress: true
            }
          }
        }
      }),
      prisma.nvrChannelAssignment.findMany({
        where: {
          cameraDeviceId: deviceId,
          organizationId: device.organizationId
        },
        orderBy: {
          nvrDevice: {
            name: "asc"
          }
        },
        select: {
          id: true,
          channelNumber: true,
          recordingEnabled: true,
          notes: true,
          updatedAt: true,
          nvrDevice: {
            select: {
              id: true,
              name: true,
              brand: true,
              model: true
            }
          }
        }
      }),
      prisma.deviceLink.findMany({
        where: {
          sourceDeviceId: deviceId,
          organizationId: device.organizationId
        },
        orderBy: {
          targetDevice: {
            name: "asc"
          }
        },
        select: {
          id: true,
          linkType: true,
          sourcePort: true,
          targetPort: true,
          poeProvided: true,
          notes: true,
          targetDevice: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        }
      }),
      prisma.deviceLink.findMany({
        where: {
          targetDeviceId: deviceId,
          organizationId: device.organizationId
        },
        orderBy: {
          sourceDevice: {
            name: "asc"
          }
        },
        select: {
          id: true,
          linkType: true,
          sourcePort: true,
          targetPort: true,
          poeProvided: true,
          notes: true,
          sourceDevice: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        }
      })
    ]);

  return {
    organizationId: device.organizationId,
    siteId: device.siteId,
    accessReferences,
    nvrAssignmentsAsNvr,
    nvrAssignmentsAsCamera,
    outgoingLinks,
    incomingLinks
  };
}
