import {
  DeviceStatus,
  DeviceType,
  MonitoringMode
} from "@prisma/client";

import { prisma } from "@/lib/db";
import { getOrganizationOptions } from "@/lib/management/organizations";
import { getScopedRecordWhere, isGlobalAccessUser, type TenantUser } from "@/lib/management/tenant";
import {
  deviceImportCsvRowSchema,
  type DeviceImportCsvRowInput
} from "@/lib/validations/device-import";

export const MAX_DEVICE_IMPORT_ROWS = 500;

export const DEVICE_IMPORT_TEMPLATE_COLUMNS = [
  "name",
  "device type",
  "brand",
  "model",
  "serial number",
  "MAC address",
  "hostname",
  "IP address",
  "firmware version",
  "project installation",
  "site",
  "network segment",
  "mount location",
  "notes",
  "NVR device reference",
  "channel number",
  "recording enabled"
] as const;

export const DEVICE_IMPORT_TEMPLATE_ROWS = [
  [
    "CAM-LOBBY-01",
    "camera",
    "Reolink",
    "RLC-811A",
    "RLK-1001",
    "00:1B:44:11:3A:B7",
    "cam-lobby-01",
    "10.20.20.101",
    "v3.1.0.989",
    "MMG Manhattan CCTV Refresh",
    "Manhattan Surgical Pavilion",
    "Camera VLAN",
    "Lobby entrance",
    "South-facing entrance view",
    "NVR-MAIN-01",
    "1",
    "true"
  ],
  [
    "NVR-MAIN-01",
    "nvr",
    "LTS",
    "LTN8932",
    "LTS-0021",
    "",
    "nvr-main-01",
    "10.20.20.10",
    "v5.0.22",
    "MMG Manhattan CCTV Refresh",
    "Manhattan Surgical Pavilion",
    "Camera VLAN",
    "",
    "Main recorder in MDF rack",
    "",
    "",
    ""
  ]
] as const;

export type DeviceImportSiteOption = {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
};

export type DeviceImportProjectOption = {
  id: string;
  name: string;
  projectCode: string | null;
  organizationId: string;
  organizationName: string;
  siteIds: string[];
};

export type DeviceImportNetworkSegmentOption = {
  id: string;
  name: string;
  organizationId: string;
  siteId: string;
  vlanId: number | null;
  label: string;
};

export type DeviceImportNvrOption = {
  id: string;
  name: string;
  organizationId: string;
  siteId: string;
  projectInstallationId: string | null;
  serialNumber: string | null;
  hostname: string | null;
  ipAddress: string | null;
  vendorExternalId: string | null;
};

export type DeviceImportBootstrap = {
  organizations: Awaited<ReturnType<typeof getOrganizationOptions>>;
  sites: DeviceImportSiteOption[];
  projects: DeviceImportProjectOption[];
  networkSegments: DeviceImportNetworkSegmentOption[];
  existingNvrs: DeviceImportNvrOption[];
  lockOrganizationId: string | null;
};

export type DeviceImportResolvedAssignment =
  | {
      kind: "existing";
      deviceId: string;
      label: string;
      channelNumber: number;
      recordingEnabled: boolean;
    }
  | {
      kind: "imported";
      importedRowNumber: number;
      label: string;
      channelNumber: number;
      recordingEnabled: boolean;
    };

export type DeviceImportResolvedRow = {
  rowNumber: number;
  siteId: string;
  projectInstallationId: string | null;
  networkSegmentId: string | null;
  name: string;
  type: DeviceType;
  brand: string;
  model: string | null;
  serialNumber: string | null;
  macAddress: string | null;
  hostname: string | null;
  ipAddress: string | null;
  firmwareVersion: string | null;
  mountLocation: string | null;
  notes: string | null;
  monitoringMode: MonitoringMode;
  status: DeviceStatus;
  nvrAssignment: DeviceImportResolvedAssignment | null;
};

export type DeviceImportPreviewRow = {
  rowNumber: number;
  raw: DeviceImportCsvRowInput;
  resolvedType: DeviceType | null;
  siteLabel: string;
  projectLabel: string;
  networkSegmentLabel: string;
  nvrLabel: string;
  errors: string[];
  warnings: string[];
  dependencyRowNumbers: number[];
  importValues: DeviceImportResolvedRow | null;
};

export type DeviceImportPreview = {
  rows: DeviceImportPreviewRow[];
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    warningRows: number;
    deviceCount: number;
    cameraCount: number;
    nvrAssignmentCount: number;
  };
};

type BaseResolvedRow = {
  rowNumber: number;
  raw: DeviceImportCsvRowInput;
  resolvedType: DeviceType | null;
  siteId: string | null;
  siteLabel: string;
  projectInstallationId: string | null;
  projectLabel: string;
  networkSegmentId: string | null;
  networkSegmentLabel: string;
  errors: string[];
  warnings: string[];
  baseValues: Omit<DeviceImportResolvedRow, "nvrAssignment" | "rowNumber" | "siteId" | "projectInstallationId" | "networkSegmentId"> & {
    mountLocation: string | null;
    notes: string | null;
  } | null;
};

const headerAliases: Record<string, keyof DeviceImportCsvRowInput> = {
  name: "name",
  devicetype: "deviceType",
  type: "deviceType",
  brand: "brand",
  model: "model",
  serialnumber: "serialNumber",
  serial: "serialNumber",
  macaddress: "macAddress",
  mac: "macAddress",
  hostname: "hostname",
  ipaddress: "ipAddress",
  ip: "ipAddress",
  firmwareversion: "firmwareVersion",
  firmware: "firmwareVersion",
  projectinstallation: "projectInstallation",
  project: "projectInstallation",
  site: "site",
  networksegment: "networkSegment",
  vlan: "networkSegment",
  mountlocation: "mountLocation",
  location: "mountLocation",
  notes: "notes",
  nvrdevicereference: "nvrDeviceReference",
  nvrreference: "nvrDeviceReference",
  nvr: "nvrDeviceReference",
  channelnumber: "channelNumber",
  channel: "channelNumber",
  recordingenabled: "recordingEnabled",
  recording: "recordingEnabled"
};

const deviceTypeAliases: Record<string, DeviceType> = {
  camera: DeviceType.CAMERA,
  ipcamera: DeviceType.CAMERA,
  cam: DeviceType.CAMERA,
  switch: DeviceType.SWITCH,
  router: DeviceType.ROUTER,
  accesspoint: DeviceType.ACCESS_POINT,
  ap: DeviceType.ACCESS_POINT,
  nvr: DeviceType.NVR,
  accesscontrol: DeviceType.ACCESS_CONTROL,
  server: DeviceType.SERVER,
  sensor: DeviceType.SENSOR,
  other: DeviceType.OTHER
};

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeToken(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeNullable(value: string) {
  return value.trim() ? value.trim() : null;
}

function buildDeviceReferenceTokens(record: {
  id: string;
  name?: string | null;
  serialNumber?: string | null;
  hostname?: string | null;
  ipAddress?: string | null;
  vendorExternalId?: string | null;
}) {
  return [
    record.id,
    record.name,
    record.serialNumber,
    record.hostname,
    record.ipAddress,
    record.vendorExternalId
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(normalizeToken);
}

function findUniqueMatch<T>(
  reference: string,
  records: T[],
  getTokens: (record: T) => string[]
) {
  const normalizedReference = normalizeToken(reference);

  if (!normalizedReference) {
    return {
      match: null,
      ambiguous: false
    };
  }

  const matches = records.filter((record) =>
    getTokens(record).includes(normalizedReference)
  );

  return {
    match: matches.length === 1 ? matches[0] : null,
    ambiguous: matches.length > 1
  };
}

function parseBooleanish(value: string) {
  const normalizedValue = normalizeToken(value);

  if (!normalizedValue) {
    return null;
  }

  if (["true", "yes", "y", "1", "on"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "no", "n", "0", "off"].includes(normalizedValue)) {
    return false;
  }

  return "invalid";
}

function parseChannelNumber(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const parsed = Number(normalizedValue);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return "invalid";
  }

  return parsed;
}

function mapDeviceType(value: string) {
  const normalizedValue = normalizeHeader(value);
  return deviceTypeAliases[normalizedValue] ?? null;
}

function parseCsvLine(line: string, delimiter: string) {
  const values: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === "\"") {
      if (inQuotes && nextCharacter === "\"") {
        currentValue += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (character === delimiter && !inQuotes) {
      values.push(currentValue);
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  if (inQuotes) {
    throw new Error("The CSV contains an unclosed quoted value.");
  }

  values.push(currentValue);

  return values;
}

export function parseDeviceImportCsv(text: string): DeviceImportCsvRowInput[] {
  const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  if (!normalizedText) {
    throw new Error("The uploaded CSV is empty.");
  }

  const [headerLine, ...dataLines] = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (dataLines.length > MAX_DEVICE_IMPORT_ROWS) {
    throw new Error(
      `The uploaded CSV contains ${dataLines.length} rows. Split it into batches of ${MAX_DEVICE_IMPORT_ROWS} rows or fewer for staging imports.`
    );
  }

  const delimiter = headerLine.includes(";") && !headerLine.includes(",") ? ";" : ",";
  const headers = parseCsvLine(headerLine, delimiter);
  const mappedHeaders = headers.map((header) => headerAliases[normalizeHeader(header)] ?? null);

  if (!mappedHeaders.some(Boolean)) {
    throw new Error("No supported device import columns were found in the CSV header.");
  }

  const rows = dataLines
    .map((line) => parseCsvLine(line, delimiter))
    .map((values) => {
      const row = {
        name: "",
        deviceType: "",
        brand: "",
        model: "",
        serialNumber: "",
        macAddress: "",
        hostname: "",
        ipAddress: "",
        firmwareVersion: "",
        projectInstallation: "",
        site: "",
        networkSegment: "",
        mountLocation: "",
        notes: "",
        nvrDeviceReference: "",
        channelNumber: "",
        recordingEnabled: ""
      };

      mappedHeaders.forEach((mappedHeader, index) => {
        if (!mappedHeader) {
          return;
        }

        row[mappedHeader] = values[index]?.trim() ?? "";
      });

      return deviceImportCsvRowSchema.parse(row);
    })
    .filter((row) => Object.values(row).some((value) => value !== ""));

  if (rows.length === 0) {
    throw new Error("The CSV does not contain any importable rows.");
  }

  return rows;
}

function appendMountLocation(notes: string | null, mountLocation: string | null) {
  if (!mountLocation) {
    return notes;
  }

  if (!notes) {
    return `Mount / location: ${mountLocation}`;
  }

  return `Mount / location: ${mountLocation}\n\n${notes}`;
}

export function buildDeviceImportPreview(
  rows: DeviceImportCsvRowInput[],
  organizationId: string,
  bootstrap: DeviceImportBootstrap
): DeviceImportPreview {
  if (!organizationId) {
    return {
      rows: rows.map((row, index) => ({
        rowNumber: index + 2,
        raw: row,
        resolvedType: null,
        siteLabel: "Select an organization first",
        projectLabel: "—",
        networkSegmentLabel: "—",
        nvrLabel: "—",
        errors: ["Select an organization before previewing the CSV."],
        warnings: [],
        dependencyRowNumbers: [],
        importValues: null
      })),
      summary: {
        totalRows: rows.length,
        validRows: 0,
        invalidRows: rows.length,
        warningRows: 0,
        deviceCount: 0,
        cameraCount: 0,
        nvrAssignmentCount: 0
      }
    };
  }

  const sites = bootstrap.sites.filter(
    (site) => site.organizationId === organizationId
  );
  const projects = bootstrap.projects.filter(
    (project) => project.organizationId === organizationId
  );
  const networkSegments = bootstrap.networkSegments.filter(
    (segment) => segment.organizationId === organizationId
  );
  const existingNvrs = bootstrap.existingNvrs.filter(
    (device) => device.organizationId === organizationId
  );

  const baseRows: BaseResolvedRow[] = rows.map((row, index) => {
    const rowNumber = index + 2;
    const errors: string[] = [];
    const warnings: string[] = [];
    const resolvedType = mapDeviceType(row.deviceType);

    if (!row.name) {
      errors.push("Device name is required.");
    }

    if (!resolvedType) {
      errors.push("Device type is missing or unsupported.");
    }

    if (!row.brand) {
      errors.push("Brand is required.");
    }

    const siteMatch = findUniqueMatch(row.site, sites, (site) => [
      site.id,
      site.name
    ].map(normalizeToken));

    if (!row.site) {
      errors.push("Site reference is required.");
    } else if (siteMatch.ambiguous) {
      errors.push("Site reference matches more than one site.");
    } else if (!siteMatch.match) {
      errors.push("Site reference does not match any site in the selected organization.");
    }

    const projectCandidates = siteMatch.match
      ? projects.filter(
          (project) =>
            project.siteIds.length === 0 || project.siteIds.includes(siteMatch.match!.id)
        )
      : projects;
    const projectMatch = row.projectInstallation
      ? findUniqueMatch(row.projectInstallation, projectCandidates, (project) =>
          [project.id, project.name, project.projectCode].filter(Boolean).map(normalizeToken)
        )
      : { match: null, ambiguous: false };

    if (row.projectInstallation) {
      if (projectMatch.ambiguous) {
        errors.push("Project reference matches more than one project.");
      } else if (!projectMatch.match) {
        errors.push("Project reference does not match an accessible project for the selected site.");
      }
    }

    const networkSegmentCandidates = siteMatch.match
      ? networkSegments.filter((segment) => segment.siteId === siteMatch.match!.id)
      : [];
    const networkSegmentMatch = row.networkSegment
      ? findUniqueMatch(row.networkSegment, networkSegmentCandidates, (segment) =>
          [segment.id, segment.name].map(normalizeToken)
        )
      : { match: null, ambiguous: false };

    if (row.networkSegment) {
      if (!siteMatch.match) {
        errors.push("Site must resolve before a network segment can be matched.");
      } else if (networkSegmentMatch.ambiguous) {
        errors.push("Network segment reference matches more than one segment for this site.");
      } else if (!networkSegmentMatch.match) {
        errors.push("Network segment reference does not match this site.");
      }
    }

    const recordingEnabled = parseBooleanish(row.recordingEnabled);
    if (recordingEnabled === "invalid") {
      errors.push("Recording enabled must be true/false, yes/no, or 1/0.");
    }

    const channelNumber = parseChannelNumber(row.channelNumber);
    if (channelNumber === "invalid") {
      errors.push("Channel number must be a positive integer.");
    }

    if (resolvedType && resolvedType !== DeviceType.CAMERA) {
      if (row.nvrDeviceReference || row.channelNumber || row.recordingEnabled) {
        warnings.push("Camera mapping fields will be ignored for non-camera rows.");
      }
      if (row.mountLocation) {
        warnings.push("Mount location will be stored in notes for this device.");
      }
    }

    const normalizedNotes = appendMountLocation(
      normalizeNullable(row.notes),
      normalizeNullable(row.mountLocation)
    );

    return {
      rowNumber,
      raw: row,
      resolvedType,
      siteId: siteMatch.match?.id ?? null,
      siteLabel: siteMatch.match
        ? `${siteMatch.match.name} · ${siteMatch.match.organizationName}`
        : row.site || "Missing site",
      projectInstallationId: projectMatch.match?.id ?? null,
      projectLabel: projectMatch.match
        ? projectMatch.match.projectCode
          ? `${projectMatch.match.name} · ${projectMatch.match.projectCode}`
          : projectMatch.match.name
        : row.projectInstallation || "—",
      networkSegmentId: networkSegmentMatch.match?.id ?? null,
      networkSegmentLabel: networkSegmentMatch.match
        ? networkSegmentMatch.match.label
        : row.networkSegment || "—",
      errors,
      warnings,
      baseValues: resolvedType
        ? {
            name: row.name,
            type: resolvedType,
            brand: row.brand,
            model: normalizeNullable(row.model),
            serialNumber: normalizeNullable(row.serialNumber),
            macAddress: normalizeNullable(row.macAddress),
            hostname: normalizeNullable(row.hostname),
            ipAddress: normalizeNullable(row.ipAddress),
            firmwareVersion: normalizeNullable(row.firmwareVersion),
            mountLocation: normalizeNullable(row.mountLocation),
            notes: normalizedNotes,
            monitoringMode: MonitoringMode.ACTIVE,
            status: DeviceStatus.UNKNOWN
          }
        : null
    };
  });

  const duplicateSerialRowNumbers = new Map<string, number[]>();

  baseRows.forEach((row) => {
    const serialNumber = row.baseValues?.serialNumber;

    if (!serialNumber) {
      return;
    }

    const key = normalizeToken(serialNumber);
    duplicateSerialRowNumbers.set(key, [
      ...(duplicateSerialRowNumbers.get(key) ?? []),
      row.rowNumber
    ]);
  });

  const importedNvrCandidates = baseRows
    .filter(
      (row) =>
        row.resolvedType === DeviceType.NVR &&
        row.siteId &&
        row.baseValues
    )
    .map((row) => ({
      rowNumber: row.rowNumber,
      siteId: row.siteId!,
      label: row.baseValues!.name,
      tokens: buildDeviceReferenceTokens({
        id: `row-${row.rowNumber}`,
        name: row.baseValues!.name,
        serialNumber: row.baseValues!.serialNumber,
        hostname: row.baseValues!.hostname,
        ipAddress: row.baseValues!.ipAddress
      })
    }));

  const previewRows: DeviceImportPreviewRow[] = baseRows.map((row) => {
    const errors = [...row.errors];
    const warnings = [...row.warnings];
    let nvrLabel = "—";
    const dependencyRowNumbers: number[] = [];
    let nvrAssignment: DeviceImportResolvedAssignment | null = null;

    const duplicateSerials = row.baseValues?.serialNumber
      ? duplicateSerialRowNumbers.get(normalizeToken(row.baseValues.serialNumber)) ?? []
      : [];

    if (duplicateSerials.length > 1) {
      errors.push(
        `Serial number is duplicated in rows ${duplicateSerials.join(", ")}.`
      );
    }

    if (row.resolvedType === DeviceType.CAMERA && row.raw.nvrDeviceReference) {
      if (!row.siteId) {
        errors.push("Camera rows need a valid site before an NVR reference can be resolved.");
      } else {
        const existingNvrMatch = findUniqueMatch(
          row.raw.nvrDeviceReference,
          existingNvrs.filter((device) => device.siteId === row.siteId),
          (device) => buildDeviceReferenceTokens(device)
        );
        const importedNvrMatch = findUniqueMatch(
          row.raw.nvrDeviceReference,
          importedNvrCandidates.filter(
            (device) => device.siteId === row.siteId && device.rowNumber !== row.rowNumber
          ),
          (device) => device.tokens
        );

        if (existingNvrMatch.ambiguous || importedNvrMatch.ambiguous) {
          errors.push("NVR reference matches more than one recorder.");
        } else if (existingNvrMatch.match && importedNvrMatch.match) {
          errors.push("NVR reference matches both an existing recorder and an imported row.");
        } else if (existingNvrMatch.match) {
          const channelNumber = parseChannelNumber(row.raw.channelNumber);

          if (channelNumber === null || channelNumber === "invalid") {
            errors.push("Camera rows with an NVR reference require a valid channel number.");
          } else {
            const recordingEnabled = parseBooleanish(row.raw.recordingEnabled);

            nvrAssignment = {
              kind: "existing",
              deviceId: existingNvrMatch.match.id,
              label: existingNvrMatch.match.name,
              channelNumber,
              recordingEnabled:
                recordingEnabled === null ? true : Boolean(recordingEnabled)
            };
            nvrLabel = `${existingNvrMatch.match.name} · CH ${channelNumber}`;
          }
        } else if (importedNvrMatch.match) {
          const channelNumber = parseChannelNumber(row.raw.channelNumber);

          if (channelNumber === null || channelNumber === "invalid") {
            errors.push("Camera rows with an NVR reference require a valid channel number.");
          } else {
            const recordingEnabled = parseBooleanish(row.raw.recordingEnabled);

            nvrAssignment = {
              kind: "imported",
              importedRowNumber: importedNvrMatch.match.rowNumber,
              label: importedNvrMatch.match.label,
              channelNumber,
              recordingEnabled:
                recordingEnabled === null ? true : Boolean(recordingEnabled)
            };
            nvrLabel = `${importedNvrMatch.match.label} · CH ${channelNumber}`;
            dependencyRowNumbers.push(importedNvrMatch.match.rowNumber);
          }
        } else {
          errors.push("NVR reference does not match an existing or imported NVR in the same site.");
        }
      }
    } else if (row.resolvedType === DeviceType.CAMERA && (row.raw.channelNumber || row.raw.recordingEnabled)) {
      warnings.push("Camera channel or recording values were provided without an NVR reference.");
    }

    return {
      rowNumber: row.rowNumber,
      raw: row.raw,
      resolvedType: row.resolvedType,
      siteLabel: row.siteLabel,
      projectLabel: row.projectLabel,
      networkSegmentLabel: row.networkSegmentLabel,
      nvrLabel,
      errors,
      warnings,
      dependencyRowNumbers,
      importValues:
        errors.length === 0 && row.baseValues && row.siteId
          ? {
              rowNumber: row.rowNumber,
              siteId: row.siteId,
              projectInstallationId: row.projectInstallationId,
              networkSegmentId: row.networkSegmentId,
              name: row.baseValues.name,
              type: row.baseValues.type,
              brand: row.baseValues.brand,
              model: row.baseValues.model,
              serialNumber: row.baseValues.serialNumber,
              macAddress: row.baseValues.macAddress,
              hostname: row.baseValues.hostname,
              ipAddress: row.baseValues.ipAddress,
              firmwareVersion: row.baseValues.firmwareVersion,
              mountLocation: row.baseValues.mountLocation,
              notes: row.baseValues.notes,
              monitoringMode: row.baseValues.monitoringMode,
              status: row.baseValues.status,
              nvrAssignment
            }
          : null
    };
  });

  const validRows = previewRows.filter((row) => row.importValues).length;
  const warningRows = previewRows.filter(
    (row) => row.importValues && row.warnings.length > 0
  ).length;
  const deviceCount = previewRows.filter((row) => row.importValues).length;
  const cameraCount = previewRows.filter(
    (row) => row.importValues?.type === DeviceType.CAMERA
  ).length;
  const nvrAssignmentCount = previewRows.filter(
    (row) => row.importValues?.nvrAssignment
  ).length;

  return {
    rows: previewRows,
    summary: {
      totalRows: previewRows.length,
      validRows,
      invalidRows: previewRows.length - validRows,
      warningRows,
      deviceCount,
      cameraCount,
      nvrAssignmentCount
    }
  };
}

export async function getDeviceImportBootstrap(
  user: TenantUser
): Promise<DeviceImportBootstrap> {
  const [organizations, sites, projects, networkSegments, existingNvrs] =
    await Promise.all([
      getOrganizationOptions(user),
      prisma.site.findMany({
        where: {
          ...getScopedRecordWhere(user)
        },
        orderBy: [
          {
            organization: {
              name: "asc"
            }
          },
          {
            name: "asc"
          }
        ],
        select: {
          id: true,
          name: true,
          organizationId: true,
          organization: {
            select: {
              name: true
            }
          }
        }
      }),
      prisma.projectInstallation.findMany({
        where: {
          ...getScopedRecordWhere(user)
        },
        orderBy: [
          {
            organization: {
              name: "asc"
            }
          },
          {
            name: "asc"
          }
        ],
        select: {
          id: true,
          name: true,
          projectCode: true,
          organizationId: true,
          organization: {
            select: {
              name: true
            }
          },
          primarySiteId: true,
          projectSites: {
            select: {
              siteId: true
            }
          }
        }
      }),
      prisma.networkSegment.findMany({
        where: {
          ...getScopedRecordWhere(user)
        },
        orderBy: [
          {
            site: {
              name: "asc"
            }
          },
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
          organizationId: true,
          siteId: true,
          vlanId: true
        }
      }),
      prisma.device.findMany({
        where: {
          type: DeviceType.NVR,
          ...getScopedRecordWhere(user)
        },
        orderBy: [
          {
            site: {
              name: "asc"
            }
          },
          {
            name: "asc"
          }
        ],
        select: {
          id: true,
          name: true,
          organizationId: true,
          siteId: true,
          projectInstallationId: true,
          serialNumber: true,
          hostname: true,
          ipAddress: true,
          vendorExternalId: true
        }
      })
    ]);

  return {
    organizations,
    sites: sites.map((site) => ({
      id: site.id,
      name: site.name,
      organizationId: site.organizationId,
      organizationName: site.organization.name
    })),
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      projectCode: project.projectCode,
      organizationId: project.organizationId,
      organizationName: project.organization.name,
      siteIds: Array.from(
        new Set(
          [
            ...(project.primarySiteId ? [project.primarySiteId] : []),
            ...project.projectSites.map((projectSite) => projectSite.siteId)
          ].filter(Boolean)
        )
      )
    })),
    networkSegments: networkSegments.map((segment) => ({
      id: segment.id,
      name: segment.name,
      organizationId: segment.organizationId,
      siteId: segment.siteId,
      vlanId: segment.vlanId,
      label: `${segment.name}${segment.vlanId ? ` · VLAN ${segment.vlanId}` : ""}`
    })),
    existingNvrs,
    lockOrganizationId: isGlobalAccessUser(user) ? null : user.organizationId
  };
}
