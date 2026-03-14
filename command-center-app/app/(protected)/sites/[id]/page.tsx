import Link from "next/link";
import { DeviceStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { Activity, FolderTree, Network, Plus, RefreshCw, Router } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { AccessReferenceForm } from "@/components/management/access-reference-form";
import { DeviceLinkForm } from "@/components/management/device-link-form";
import { NetworkSegmentForm } from "@/components/management/network-segment-form";
import { NvrChannelAssignmentForm } from "@/components/management/nvr-channel-assignment-form";
import { SiteLocationMap } from "@/components/management/site-location-map";
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
import {
  createAccessReferenceAction,
  createDeviceLinkAction,
  createNetworkSegmentAction,
  createNvrChannelAssignmentAction,
  updateAccessReferenceAction,
  updateDeviceLinkAction,
  updateNetworkSegmentAction,
  updateNvrChannelAssignmentAction
} from "@/app/(protected)/infrastructure-actions";
import { simulateSiteHealthRunAction } from "@/app/(protected)/monitoring-actions";
import { requireRoles } from "@/lib/auth";
import { getRecentAlertsForScope } from "@/lib/management/alerts";
import {
  getSiteInfrastructureDetail,
  getSiteInfrastructureOptions
} from "@/lib/management/infrastructure";
import {
  deriveSiteHealthRollupFromStatusCounts,
  getSiteHealthTimeline
} from "@/lib/management/health";
import { getSearchParamValue } from "@/lib/management/search-params";
import { getSiteDetail } from "@/lib/management/sites";
import {
  canAcknowledgeAlerts,
  canResolveAlerts,
  canRunHealthSimulation,
  canWriteTenantInventory,
  routeAccess
} from "@/lib/rbac";
import {
  deviceLinkTypeTone,
  deviceStatusTone,
  projectInstallationStatusTone,
  siteStatusTone
} from "@/lib/status";
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
  searchParams?: Record<string, string | string[] | undefined>;
};

function getStatusCount(
  counts: Array<{ status: DeviceStatus; _count: { _all: number } }>,
  status: DeviceStatus
) {
  return counts.find((entry) => entry.status === status)?._count._all ?? 0;
}

export default async function SiteDetailPage({
  params,
  searchParams = {}
}: SiteDetailPageProps) {
  const user = await requireRoles(routeAccess.sites);
  const canWrite = canWriteTenantInventory(user.role);
  const canSimulate = canRunHealthSimulation(user.role);
  const [
    site,
    healthTimeline,
    recentAlerts,
    infrastructure,
    infrastructureOptions
  ] = await Promise.all([
    getSiteDetail(user, params.id),
    getSiteHealthTimeline(user, params.id),
    getRecentAlertsForScope(user, {
      siteId: params.id,
      limit: 6
    }),
    getSiteInfrastructureDetail(user, params.id),
    canWrite ? getSiteInfrastructureOptions(user, params.id) : Promise.resolve(null)
  ]);

  if (!site || !infrastructure) {
    notFound();
  }

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

  const editAccessReferenceId = getSearchParamValue(searchParams.editAccessReference);
  const accessReferenceToEdit = editAccessReferenceId
    ? infrastructure.accessReferences.find((reference) => reference.id === editAccessReferenceId)
    : null;
  const accessReferenceAction = accessReferenceToEdit
    ? updateAccessReferenceAction.bind(
        null,
        accessReferenceToEdit.id,
        `/sites/${site.id}`
      )
    : createAccessReferenceAction.bind(null, `/sites/${site.id}`);

  const editSegmentId = getSearchParamValue(searchParams.editSegment);
  const networkSegmentToEdit = editSegmentId
    ? infrastructure.networkSegments.find((segment) => segment.id === editSegmentId)
    : null;
  const networkSegmentAction = networkSegmentToEdit
    ? updateNetworkSegmentAction.bind(
        null,
        networkSegmentToEdit.id,
        `/sites/${site.id}`
      )
    : createNetworkSegmentAction.bind(null, `/sites/${site.id}`);

  const editAssignmentId = getSearchParamValue(searchParams.editAssignment);
  const nvrAssignmentToEdit = editAssignmentId
    ? infrastructure.nvrAssignments.find((assignment) => assignment.id === editAssignmentId)
    : null;
  const nvrAssignmentAction = nvrAssignmentToEdit
    ? updateNvrChannelAssignmentAction.bind(
        null,
        nvrAssignmentToEdit.id,
        `/sites/${site.id}`
      )
    : createNvrChannelAssignmentAction.bind(null, `/sites/${site.id}`);

  const editDeviceLinkId = getSearchParamValue(searchParams.editDeviceLink);
  const deviceLinkToEdit = editDeviceLinkId
    ? infrastructure.deviceLinks.find((deviceLink) => deviceLink.id === editDeviceLinkId)
    : null;
  const deviceLinkAction = deviceLinkToEdit
    ? updateDeviceLinkAction.bind(null, deviceLinkToEdit.id, `/sites/${site.id}`)
    : createDeviceLinkAction.bind(null, `/sites/${site.id}`);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sites"
        title={site.name}
        description="Site identity, project associations, infrastructure mappings, health history, and recent alerts."
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
            <Button variant="outline" asChild>
              <Link href={`/sites/${site.id}/export`}>Export Site PDF</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/sites/${site.id}/capacity`}>View capacity</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/sites/${site.id}/topology`}>View topology</Link>
            </Button>
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

      <div className="grid gap-4 xl:grid-cols-7">
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
            <CardDescription>Linked projects</CardDescription>
            <CardTitle>{infrastructure.projects.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Project installations referencing this location.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Network segments</CardDescription>
            <CardTitle>{infrastructure.networkSegments.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            VLANs and subnets registered for this site.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Access refs</CardDescription>
            <CardTitle>{infrastructure.accessReferences.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Vault-backed access metadata tied to the site.
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

        <div className="space-y-6">
          <SiteLocationMap
            title={site.name}
            location={location}
            latitude={site.latitude}
            longitude={site.longitude}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-sky-300" />
                Project associations
              </CardTitle>
              <CardDescription>
                Installations and rollouts currently linked to this site.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {infrastructure.projects.length === 0 ? (
                <EmptyState
                  title="No projects linked"
                  description="Link this site to a project installation from the project management flow."
                />
              ) : (
                <div className="space-y-3">
                  {infrastructure.projects.map((projectSite) => (
                    <div
                      key={projectSite.id}
                      className="rounded-2xl border border-border/70 bg-background/30 px-4 py-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <Link
                            href={`/projects/${projectSite.projectInstallation.id}`}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {projectSite.projectInstallation.name}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {formatEnumLabel(projectSite.projectInstallation.projectType)}
                            {projectSite.roleOrPhase
                              ? ` · ${projectSite.roleOrPhase}`
                              : ""}
                          </p>
                        </div>
                        <StatusBadge
                          tone={projectInstallationStatusTone(
                            projectSite.projectInstallation.status
                          )}
                          label={formatEnumLabel(projectSite.projectInstallation.status)}
                        />
                      </div>
                      {projectSite.notes ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          {projectSite.notes}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Access references</CardTitle>
            <CardDescription>
              Safe vault pointers and remote access metadata scoped to this site.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {infrastructure.accessReferences.length === 0 ? (
              <EmptyState
                title="No site access references"
                description="Store vault paths and access instructions without saving plaintext passwords."
              />
            ) : (
              <div className="space-y-3">
                {infrastructure.accessReferences.map((reference) => (
                  <div
                    key={reference.id}
                    className="rounded-2xl border border-border/70 bg-background/30 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{reference.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatEnumLabel(reference.accessType)}
                          {reference.vaultProvider ? ` · ${reference.vaultProvider}` : ""}
                          {reference.vaultPath ? ` · ${reference.vaultPath}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="text-muted-foreground">
                          Owner: {reference.owner ?? "Not set"}
                        </span>
                        {canWrite ? (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/sites/${site.id}?editAccessReference=${reference.id}`}>
                              Edit
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {reference.notes ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {reference.notes}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {canWrite ? (
          <AccessReferenceForm
            title={
              accessReferenceToEdit ? "Edit site access reference" : "Add site access reference"
            }
            description="Use this for VPN, DDNS, vendor portal, SSH, or other safe remote access metadata."
            action={accessReferenceAction}
            submitLabel={accessReferenceToEdit ? "Save reference" : "Add reference"}
            context={{
              organizationId: infrastructure.organizationId,
              siteId: site.id
            }}
            initialValues={accessReferenceToEdit ?? undefined}
          />
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 text-sky-300" />
              Network segments
            </CardTitle>
            <CardDescription>
              VLANs and subnets available for device assignment and future topology work.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {infrastructure.networkSegments.length === 0 ? (
              <EmptyState
                title="No network segments"
                description="Add the first VLAN or subnet so devices can be grouped by traffic purpose."
              />
            ) : (
              <div className="space-y-3">
                {infrastructure.networkSegments.map((segment) => (
                  <div
                    key={segment.id}
                    className="rounded-2xl border border-border/70 bg-background/30 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {segment.name}
                          {segment.vlanId ? ` · VLAN ${segment.vlanId}` : ""}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {segment.subnetCidr}
                          {segment.gatewayIp ? ` · Gateway ${segment.gatewayIp}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="text-muted-foreground">
                          {segment._count.devices} devices
                        </span>
                        {canWrite ? (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/sites/${site.id}?editSegment=${segment.id}`}>
                              Edit
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {segment.purpose ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {segment.purpose}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {canWrite ? (
          <NetworkSegmentForm
            action={networkSegmentAction}
            submitLabel={networkSegmentToEdit ? "Save segment" : "Add segment"}
            context={{
              organizationId: infrastructure.organizationId,
              siteId: site.id
            }}
            initialValues={networkSegmentToEdit ?? undefined}
          />
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>NVR channel assignments</CardTitle>
            <CardDescription>
              Explicit recorder-to-camera mappings for installed surveillance channels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {infrastructure.nvrAssignments.length === 0 ? (
              <EmptyState
                title="No NVR channel mappings"
                description="Map recorder channels to installed cameras once devices are registered."
              />
            ) : (
              <div className="space-y-3">
                {infrastructure.nvrAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="rounded-2xl border border-border/70 bg-background/30 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {assignment.nvrDevice.name} · Channel {assignment.channelNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Camera: {assignment.cameraDevice.name}
                          {assignment.cameraDevice.ipAddress
                            ? ` · ${assignment.cameraDevice.ipAddress}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <StatusBadge
                          tone={assignment.recordingEnabled ? "healthy" : "warning"}
                          label={assignment.recordingEnabled ? "Recording" : "Disabled"}
                        />
                        {canWrite ? (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/sites/${site.id}?editAssignment=${assignment.id}`}>
                              Edit
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {assignment.notes ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {assignment.notes}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {canWrite && infrastructureOptions ? (
          <NvrChannelAssignmentForm
            action={nvrAssignmentAction}
            submitLabel={nvrAssignmentToEdit ? "Save assignment" : "Add assignment"}
            context={{
              organizationId: infrastructure.organizationId,
              siteId: site.id
            }}
            nvrDevices={infrastructureOptions.nvrDevices}
            cameraDevices={infrastructureOptions.cameraDevices}
            initialValues={
              nvrAssignmentToEdit
                ? {
                    nvrDeviceId: nvrAssignmentToEdit.nvrDevice.id,
                    cameraDeviceId: nvrAssignmentToEdit.cameraDevice.id,
                    channelNumber: nvrAssignmentToEdit.channelNumber,
                    recordingEnabled: nvrAssignmentToEdit.recordingEnabled,
                    notes: nvrAssignmentToEdit.notes
                  }
                : undefined
            }
          />
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Device links</CardTitle>
            <CardDescription>
              Physical or logical relationships such as uplinks, downstream ports, and PoE supply.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {infrastructure.deviceLinks.length === 0 ? (
              <EmptyState
                title="No device links"
                description="Map router-to-switch, switch-to-camera, and other infrastructure relationships."
              />
            ) : (
              <div className="space-y-3">
                {infrastructure.deviceLinks.map((deviceLink) => (
                  <div
                    key={deviceLink.id}
                    className="rounded-2xl border border-border/70 bg-background/30 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {deviceLink.sourceDevice.name} → {deviceLink.targetDevice.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {deviceLink.sourcePort ? `${deviceLink.sourcePort}` : "No source port"}
                          {" → "}
                          {deviceLink.targetPort ? `${deviceLink.targetPort}` : "No target port"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <StatusBadge
                          tone={deviceLinkTypeTone(deviceLink.linkType)}
                          label={formatEnumLabel(deviceLink.linkType)}
                        />
                        {canWrite ? (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/sites/${site.id}?editDeviceLink=${deviceLink.id}`}>
                              Edit
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {deviceLink.notes ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {deviceLink.notes}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {canWrite && infrastructureOptions ? (
          <DeviceLinkForm
            action={deviceLinkAction}
            submitLabel={deviceLinkToEdit ? "Save link" : "Add link"}
            context={{
              organizationId: infrastructure.organizationId,
              siteId: site.id
            }}
            devices={infrastructureOptions.devices}
            initialValues={
              deviceLinkToEdit
                ? {
                    sourceDeviceId: deviceLinkToEdit.sourceDevice.id,
                    targetDeviceId: deviceLinkToEdit.targetDevice.id,
                    linkType: deviceLinkToEdit.linkType,
                    sourcePort: deviceLinkToEdit.sourcePort,
                    targetPort: deviceLinkToEdit.targetPort,
                    poeProvided: deviceLinkToEdit.poeProvided,
                    notes: deviceLinkToEdit.notes
                  }
                : undefined
            }
          />
        ) : null}
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
