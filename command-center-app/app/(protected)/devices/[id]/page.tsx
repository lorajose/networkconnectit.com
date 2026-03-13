import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, MapPinned, RefreshCw } from "lucide-react";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { AlertRecordsTable } from "@/components/monitoring/alert-records-table";
import { HealthTimelineTable } from "@/components/monitoring/health-timeline-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { simulateDeviceHealthRunAction } from "@/app/(protected)/monitoring-actions";
import { requireRoles } from "@/lib/auth";
import { getDeviceDetail } from "@/lib/management/devices";
import { getRecentAlertsForScope } from "@/lib/management/alerts";
import {
  deriveDeviceHealthSummary,
  getDeviceHealthTimeline
} from "@/lib/management/health";
import {
  canAcknowledgeAlerts,
  canResolveAlerts,
  canRunHealthSimulation,
  canWriteTenantInventory,
  routeAccess
} from "@/lib/rbac";
import {
  deviceStatusTone,
  monitoringModeTone,
  siteStatusTone
} from "@/lib/status";
import {
  formatDate,
  formatEnumLabel,
  formatLocation,
  formatOptionalDateTime
} from "@/lib/utils";

type DeviceDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function DeviceDetailPage({
  params
}: DeviceDetailPageProps) {
  const user = await requireRoles(routeAccess.devices);
  const [device, healthTimeline, recentAlerts] = await Promise.all([
    getDeviceDetail(user, params.id),
    getDeviceHealthTimeline(user, params.id),
    getRecentAlertsForScope(user, {
      deviceId: params.id,
      limit: 6
    })
  ]);

  if (!device) {
    notFound();
  }

  const canWrite = canWriteTenantInventory(user.role);
  const canSimulate = canRunHealthSimulation(user.role);
  const healthSummary = deriveDeviceHealthSummary(device.status, healthTimeline);
  const simulateAction = simulateDeviceHealthRunAction.bind(
    null,
    device.id,
    `/devices/${device.id}`
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Devices"
        title={device.name}
        description="Core device metadata, tenant context, and monitoring posture."
        breadcrumbs={[
          {
            label: "Command Center",
            href: "/dashboard"
          },
          {
            label: "Devices",
            href: "/devices"
          },
          {
            label: device.name
          }
        ]}
        actions={
          <>
            {canSimulate ? (
              <form action={simulateAction}>
                <Button type="submit" variant="outline">
                  <RefreshCw className="h-4 w-4" />
                  Simulate health run
                </Button>
              </form>
            ) : null}
            {canWrite ? (
              <Button asChild>
                <Link href={`/devices/${device.id}/edit`}>Edit device</Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Status</CardDescription>
            <CardTitle>
              <StatusBadge
                tone={deviceStatusTone(device.status)}
                label={formatEnumLabel(device.status)}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Last seen {formatOptionalDateTime(device.lastSeenAt)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Latest health</CardDescription>
            <CardTitle>
              <StatusBadge
                tone={healthSummary.latestTone}
                label={healthSummary.latestLabel}
                withIcon
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {healthSummary.latestCheckedAt
              ? `Checked ${formatOptionalDateTime(healthSummary.latestCheckedAt)}`
              : "No health checks recorded yet"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Monitoring mode</CardDescription>
            <CardTitle>
              <StatusBadge
                tone={monitoringModeTone(device.monitoringMode)}
                label={formatEnumLabel(device.monitoringMode)}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Monitoring workflow assigned to this device record.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Organization</CardDescription>
            <CardTitle className="text-lg">{device.organization.name}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Tenant ownership for this device.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Site</CardDescription>
            <CardTitle className="text-lg">{device.site.name}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {formatLocation([device.site.city, device.site.country])}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Device details</CardTitle>
            <CardDescription>
              Inventory metadata, tenant ownership, and network identifiers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Type
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {formatEnumLabel(device.type)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Brand / Model
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {device.brand}
                  {device.model ? ` · ${device.model}` : ""}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  IP address
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {device.ipAddress ?? "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  MAC address
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {device.macAddress ?? "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Serial number
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {device.serialNumber ?? "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Updated
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {formatDate(device.updatedAt)}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                Notes
              </p>
              <p className="mt-1 text-foreground">{device.notes ?? "No notes added."}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPinned className="h-5 w-5 text-sky-300" />
                Location context
              </CardTitle>
              <CardDescription>
                Linked site and organization records for this device.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Site
                </p>
                <Link
                  href={`/sites/${device.site.id}`}
                  className="mt-1 block font-medium text-foreground hover:text-primary"
                >
                  {device.site.name}
                </Link>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Site status
                </p>
                <div className="mt-1">
                  <StatusBadge
                    tone={siteStatusTone(device.site.status)}
                    label={formatEnumLabel(device.site.status)}
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Organization
                </p>
                <Link
                  href={`/organizations/${device.organization.id}`}
                  className="mt-1 block font-medium text-foreground hover:text-primary"
                >
                  {device.organization.name}
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-sky-300" />
                Latest health insight
              </CardTitle>
              <CardDescription>
                Most recent monitoring state and response details for this device.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Latest message
                </p>
                <p className="mt-1 text-foreground">
                  {healthSummary.latestMessage ?? "No health-check message recorded."}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Latest latency
                </p>
                <p className="mt-1 text-foreground">
                  {healthSummary.latestLatencyMs !== null
                    ? `${healthSummary.latestLatencyMs} ms`
                    : "N/A"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <HealthTimelineTable
        title="Device health timeline"
        description="Recent health checks recorded against this device."
        entries={healthTimeline}
        showSite={false}
        showDevice={false}
      />

      <AlertRecordsTable
        title="Device alerts"
        description="Recent alerts linked directly to this device."
        alerts={recentAlerts}
        redirectTo={`/devices/${device.id}`}
        showOrganization={false}
        showSite={true}
        showDevice={false}
        canAcknowledge={canAcknowledgeAlerts(user.role)}
        canResolve={canResolveAlerts(user.role)}
      />
    </div>
  );
}
