import {
  AlertSeverity,
  AlertStatus,
  DeviceLinkType,
  DeviceStatus,
  HealthCheckType,
  HealthStatus,
  MonitoringMode,
  OrganizationStatus,
  ProjectInstallationStatus,
  ProjectPriority,
  SiteStatus
} from "@prisma/client";

import type { StatusTone } from "@/lib/dashboard/types";

export function organizationStatusTone(status: OrganizationStatus): StatusTone {
  switch (status) {
    case OrganizationStatus.ACTIVE:
      return "healthy";
    case OrganizationStatus.ONBOARDING:
      return "info";
    case OrganizationStatus.INACTIVE:
      return "unknown";
  }
}

export function siteStatusTone(status: SiteStatus): StatusTone {
  switch (status) {
    case SiteStatus.ACTIVE:
      return "healthy";
    case SiteStatus.DEGRADED:
      return "warning";
    case SiteStatus.MAINTENANCE:
      return "info";
    case SiteStatus.INACTIVE:
      return "unknown";
  }
}

export function projectInstallationStatusTone(
  status: ProjectInstallationStatus
): StatusTone {
  switch (status) {
    case ProjectInstallationStatus.ACTIVE:
    case ProjectInstallationStatus.COMPLETE:
      return "healthy";
    case ProjectInstallationStatus.IN_PROGRESS:
    case ProjectInstallationStatus.PLANNING:
      return "info";
    case ProjectInstallationStatus.ON_HOLD:
      return "warning";
    case ProjectInstallationStatus.ARCHIVED:
      return "unknown";
  }
}

export function projectPriorityTone(priority: ProjectPriority): StatusTone {
  switch (priority) {
    case ProjectPriority.CRITICAL:
      return "critical";
    case ProjectPriority.HIGH:
      return "warning";
    case ProjectPriority.MEDIUM:
      return "info";
    case ProjectPriority.LOW:
      return "unknown";
  }
}

export function deviceStatusTone(status: DeviceStatus): StatusTone {
  switch (status) {
    case DeviceStatus.ONLINE:
      return "healthy";
    case DeviceStatus.DEGRADED:
      return "warning";
    case DeviceStatus.OFFLINE:
      return "critical";
    case DeviceStatus.MAINTENANCE:
      return "info";
    case DeviceStatus.UNKNOWN:
      return "unknown";
  }
}

export function monitoringModeTone(mode: MonitoringMode): StatusTone {
  switch (mode) {
    case MonitoringMode.ACTIVE:
      return "healthy";
    case MonitoringMode.PASSIVE:
      return "info";
    case MonitoringMode.MANUAL:
      return "warning";
  }
}

export function healthStatusTone(status: HealthStatus): StatusTone {
  switch (status) {
    case HealthStatus.HEALTHY:
      return "healthy";
    case HealthStatus.WARNING:
      return "warning";
    case HealthStatus.CRITICAL:
      return "critical";
    case HealthStatus.UNKNOWN:
      return "unknown";
  }
}

export function alertSeverityTone(severity: AlertSeverity): StatusTone {
  switch (severity) {
    case AlertSeverity.CRITICAL:
      return "critical";
    case AlertSeverity.HIGH:
      return "warning";
    case AlertSeverity.MEDIUM:
      return "info";
    case AlertSeverity.LOW:
      return "unknown";
  }
}

export function alertStatusTone(status: AlertStatus): StatusTone {
  switch (status) {
    case AlertStatus.RESOLVED:
      return "healthy";
    case AlertStatus.ACKNOWLEDGED:
      return "warning";
    case AlertStatus.OPEN:
      return "critical";
  }
}

export function deviceStatusFromHealthStatus(status: HealthStatus): DeviceStatus {
  switch (status) {
    case HealthStatus.HEALTHY:
      return DeviceStatus.ONLINE;
    case HealthStatus.WARNING:
      return DeviceStatus.DEGRADED;
    case HealthStatus.CRITICAL:
      return DeviceStatus.OFFLINE;
    case HealthStatus.UNKNOWN:
      return DeviceStatus.UNKNOWN;
  }
}

export function healthStatusFromDeviceStatus(status: DeviceStatus): HealthStatus {
  switch (status) {
    case DeviceStatus.ONLINE:
      return HealthStatus.HEALTHY;
    case DeviceStatus.DEGRADED:
    case DeviceStatus.MAINTENANCE:
      return HealthStatus.WARNING;
    case DeviceStatus.OFFLINE:
      return HealthStatus.CRITICAL;
    case DeviceStatus.UNKNOWN:
      return HealthStatus.UNKNOWN;
  }
}

export function alertSeverityFromHealthStatus(status: HealthStatus): AlertSeverity {
  switch (status) {
    case HealthStatus.CRITICAL:
      return AlertSeverity.CRITICAL;
    case HealthStatus.WARNING:
      return AlertSeverity.HIGH;
    case HealthStatus.UNKNOWN:
      return AlertSeverity.MEDIUM;
    case HealthStatus.HEALTHY:
      return AlertSeverity.LOW;
  }
}

export function healthCheckTypeTone(_type: HealthCheckType): StatusTone {
  return "info";
}

export function deviceLinkTypeTone(linkType: DeviceLinkType): StatusTone {
  switch (linkType) {
    case DeviceLinkType.POE_SUPPLY:
    case DeviceLinkType.UPLINK:
      return "healthy";
    case DeviceLinkType.MANAGEMENT:
    case DeviceLinkType.RECORDING:
      return "info";
    case DeviceLinkType.DOWNSTREAM:
    case DeviceLinkType.WIRELESS_UPLINK:
      return "warning";
    case DeviceLinkType.OTHER:
      return "unknown";
  }
}
