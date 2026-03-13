import Link from "next/link";
import { DeviceStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { Activity, Plus, RefreshCw, Router } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { AlertRecordsTable } from "@/components/monitoring/alert-records-table";
import { HealthTimelineTable } from "@/components/monitoring/health-timeline-table";
import { PageHeader } from "@/components/page-header";
import { SiteLocationMap } from "@/components/management/site-location-map";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { simulateSiteHealthRunAction } from "@/app/(protected)/monitoring-actions";
import { requireRoles } from "@/lib/auth";
import { getRecentAlertsForScope } from "@/lib/management/alerts";
import {
  deriveSiteHealthRollupFromStatusCounts,
  getSiteHealthTimeline
} from "@/lib/management/health";
import { getSiteDetail } from "@/lib/management/sites";
import {
  canAcknowledgeAlerts,
  canResolveAlerts,
  canRunHealthSimulation,
  canWriteTenantInventory,
  routeAccess
} from "@/lib/rbac";
import { deviceStatusTone, siteStatusTone } from "@/lib/status";
import {
  formatDate,
  formatEnumLabel,
  formatLocation,
  formatOptionalDateTime
} from "@/lib/utils";

type SiteDetailPageProps = {
  params: {
    id: string;
  };
};

function getStatusCount(
  counts: Array<{ status: DeviceStatus; _count: { _all: number } }>,
  status: DeviceStatus
) {
  return counts.find((entry) => entry.status === status)?._count._all ?? 0;
}

export default async function SiteDetailPage({ params }: SiteDetailPageProps) {
  const user = await requireRoles(routeAccess.sites);
  const [site, healthTimeline, recentAlerts] = await Promise.all([
    getSiteDetail(user, params.id),
    getSiteHealthTimeline(user, params.id),
    getRecentAlertsForScope(user, {
      siteId: params.id,
      limit: 6
    })
  ]);

  if (!site) {
    notFound();
  }

  const canWrite = canWriteTenantInventory(user.role);
  const canSimulate = canRunHealthSimulation(user.role);
  const location = formatLocation([
    site.addressLine1,
    site.city,
    site.stateRegion,
    site.postalCode,
    site.country
  ]);
  const siteHealth = deriveSiteHealthRollupFromStatusCounts(
    site.deviceStatuses,
    healthTimeline[0]?.checkedAt ?? null
  );
  const simulateAction = simulateSiteHealthRunAction.bind(
    null,
    site.id,
    `/sites/${site.id}`
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sites"
        title={site.name}
        description="Site identity, location metadata, device rollups, health history, and recent alerts."
        breadcrumbs={[
          {
            label: "Command Center",
            href: "/dashboard"
          },
          {
            label: "Sites",
            href: "/sites"
          },
          {
            label: site.name
          }
        ]}
        actions={
          <>
            {canSimulate ? (
              <form action={simulateAction}>
                <Button type="submit" variant="outline">
                  <RefreshCw className="h-4 w-4" />
                  Simulate site health
                </Button>
              </form>
            ) : null}
            {canWrite ? (
              <Button asChild>
                <Link href={`/sites/${site.id}/edit`}>Edit site</Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Status</CardDescription>
            <CardTitle>
              <StatusBadge
                tone={siteStatusTone(site.status)}
                label={formatEnumLabel(site.status)}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Updated {formatDate(site.updatedAt)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Site health</CardDescription>
            <CardTitle>
              <StatusBadge tone={siteHealth.health} label={siteHealth.label} withIcon />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {siteHealth.lastCheckAt
              ? `Last check ${formatOptionalDateTime(siteHealth.lastCheckAt)}`
              : "No health checks recorded yet"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total devices</CardDescription>
            <CardTitle>{siteHealth.devicesCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Devices currently assigned to this site.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Devices online</CardDescription>
            <CardTitle>{getStatusCount(site.deviceStatuses, DeviceStatus.ONLINE)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Responding within the last monitoring interval.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Warning devices</CardDescription>
            <CardTitle>{siteHealth.warningCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Devices reporting degraded or maintenance conditions.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Unknown devices</CardDescription>
            <CardTitle>{siteHealth.unknownCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Devices without a fresh health state.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Tracked alerts</CardDescription>
            <CardTitle>{site._count.alerts}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Recent alerts linked to this site.
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Site details</CardTitle>
            <CardDescription>
              Identity, address, tenant context, and timestamps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Organization
                </p>
                <Link
                  href={`/organizations/${site.organization.id}`}
                  className="mt-1 block font-medium text-foreground hover:text-primary"
                >
                  {site.organization.name}
                </Link>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Timezone
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {site.timezone ?? "Not set"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                Address
              </p>
              <p className="mt-1 font-medium text-foreground">{location}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Created
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {formatDate(site.createdAt)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Notes
                </p>
                <p className="mt-1 text-foreground">{site.notes ?? "No notes added."}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Online
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {siteHealth.onlineCount}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Offline
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {siteHealth.offlineCount}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Warning
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {siteHealth.warningCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <SiteLocationMap
          title={site.name}
          location={location}
          latitude={site.latitude}
          longitude={site.longitude}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Related devices</CardTitle>
              <CardDescription>
                Devices currently registered against this site.
              </CardDescription>
            </div>
            {canWrite ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/devices/new">
                  <Plus className="h-4 w-4" />
                  Add device
                </Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {site.devices.length === 0 ? (
              <EmptyState
                title="No devices yet"
                description="Attach a device to this site to begin inventory and health tracking."
              />
            ) : (
              <div className="space-y-3">
                {site.devices.map((device) => (
                  <div
                    key={device.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/30 px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <Link
                        href={`/devices/${device.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {device.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {formatEnumLabel(device.type)}
                        {device.brand ? ` · ${device.brand}` : ""}
                        {device.model ? ` ${device.model}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <StatusBadge
                        tone={deviceStatusTone(device.status)}
                        label={formatEnumLabel(device.status)}
                      />
                      <span className="text-muted-foreground">
                        Last seen {formatOptionalDateTime(device.lastSeenAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-sky-300" />
                Rollup insight
              </CardTitle>
              <CardDescription>
                Derived from the latest device states and recent health checks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Latest check
                </p>
                <p className="mt-1 text-foreground">
                  {siteHealth.lastCheckAt
                    ? formatOptionalDateTime(siteHealth.lastCheckAt)
                    : "No checks recorded"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Health posture
                </p>
                <p className="mt-1 text-foreground">
                  {siteHealth.label} across {siteHealth.devicesCount} devices
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Router className="h-5 w-5 text-sky-300" />
                Last update
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This site record was updated on {formatDate(site.updatedAt)}.
            </CardContent>
          </Card>
        </div>
      </div>

      <HealthTimelineTable
        title="Site health timeline"
        description="Recent health checks across devices assigned to this site."
        entries={healthTimeline}
        showOrganization={false}
        showSite={false}
        showDevice
      />

      <AlertRecordsTable
        title="Site alerts"
        description="Recent alerts linked to this site and its assigned devices."
        alerts={recentAlerts}
        redirectTo={`/sites/${site.id}`}
        showOrganization={false}
        showSite={false}
        showDevice
        canAcknowledge={canAcknowledgeAlerts(user.role)}
        canResolve={canResolveAlerts(user.role)}
      />
    </div>
  );
}
