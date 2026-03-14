import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, Link2, MapPinned, Shield } from "lucide-react";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { AccessReferenceForm } from "@/components/management/access-reference-form";
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
  updateAccessReferenceAction
} from "@/app/(protected)/infrastructure-actions";
import { simulateDeviceHealthRunAction } from "@/app/(protected)/monitoring-actions";
import { requireRoles } from "@/lib/auth";
import { getDeviceDetail } from "@/lib/management/devices";
import { getRecentAlertsForScope } from "@/lib/management/alerts";
import { getDeviceInfrastructureDetail } from "@/lib/management/infrastructure";
import {
  deriveDeviceHealthSummary,
  getDeviceHealthTimeline
} from "@/lib/management/health";
import { getSearchParamValue } from "@/lib/management/search-params";
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
  monitoringModeTone,
  projectInstallationStatusTone,
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
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function DeviceDetailPage({
  params,
  searchParams = {}
}: DeviceDetailPageProps) {
  const user = await requireRoles(routeAccess.devices);
  const [device, healthTimeline, recentAlerts, infrastructure] = await Promise.all([
    getDeviceDetail(user, params.id),
    getDeviceHealthTimeline(user, params.id),
    getRecentAlertsForScope(user, {
      deviceId: params.id,
      limit: 6
    }),
    getDeviceInfrastructureDetail(user, params.id)
  ]);

  if (!device || !infrastructure) {
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
  const editAccessReferenceId = getSearchParamValue(searchParams.editAccessReference);
  const accessReferenceToEdit = editAccessReferenceId
    ? infrastructure.accessReferences.find((reference) => reference.id === editAccessReferenceId)
    : null;
  const accessReferenceAction = accessReferenceToEdit
    ? updateAccessReferenceAction.bind(
        null,
        accessReferenceToEdit.id,
        `/devices/${device.id}`
      )
    : createAccessReferenceAction.bind(null, `/devices/${device.id}`);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Devices"
        title={device.name}
        description="Core device metadata, project context, network placement, and monitoring posture."
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
                  <Activity className="h-4 w-4" />
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
              Inventory metadata, tenant ownership, project assignment, and network identifiers.
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
                  Hostname
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {device.hostname ?? "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Firmware version
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {device.firmwareVersion ?? "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Vendor external ID
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {device.vendorExternalId ?? "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Switch role
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {device.switchRole ? formatEnumLabel(device.switchRole) : "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Installed at
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {device.installedAt ? formatDate(device.installedAt) : "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Port usage
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {device.portCount
                    ? `${device.usedPortCount ?? "?"} / ${device.portCount}`
                    : "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  PoE budget / used
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {device.poeBudgetWatts !== null && device.poeBudgetWatts !== undefined
                    ? `${device.poeUsedWatts ?? "?"}W / ${device.poeBudgetWatts}W`
                    : "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  PoE required
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {typeof device.poeRequired === "boolean"
                    ? device.poeRequired
                      ? "Yes"
                      : "No"
                    : "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Estimated PoE draw
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {device.estimatedPoeWatts !== null &&
                  device.estimatedPoeWatts !== undefined
                    ? `${device.estimatedPoeWatts}W`
                    : "Not set"}
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
                Location and project context
              </CardTitle>
              <CardDescription>
                Site, project, and segment placement for this device.
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
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Project installation
                </p>
                {device.projectInstallation ? (
                  <div className="mt-1 space-y-2">
                    <Link
                      href={`/projects/${device.projectInstallation.id}`}
                      className="block font-medium text-foreground hover:text-primary"
                    >
                      {device.projectInstallation.name}
                    </Link>
                    <StatusBadge
                      tone={projectInstallationStatusTone(
                        device.projectInstallation.status
                      )}
                      label={formatEnumLabel(device.projectInstallation.status)}
                    />
                  </div>
                ) : (
                  <p className="mt-1 text-foreground">No project assignment</p>
                )}
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Network segment
                </p>
                <p className="mt-1 text-foreground">
                  {device.networkSegment
                    ? `${device.networkSegment.name}${
                        device.networkSegment.vlanId
                          ? ` · VLAN ${device.networkSegment.vlanId}`
                          : ""
                      } · ${device.networkSegment.subnetCidr}`
                    : "Not assigned"}
                </p>
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

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-sky-300" />
              Access references
            </CardTitle>
            <CardDescription>
              Safe vault and remote-access metadata tied directly to this device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {infrastructure.accessReferences.length === 0 ? (
              <EmptyState
                title="No device access references"
                description="Add a vault reference, owner, or remote access note without storing raw credentials."
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
                            <Link
                              href={`/devices/${device.id}?editAccessReference=${reference.id}`}
                            >
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
              accessReferenceToEdit
                ? "Edit device access reference"
                : "Add device access reference"
            }
            description="Use this for vendor portals, camera web UI, SSH, or other device-specific secure metadata."
            action={accessReferenceAction}
            submitLabel={accessReferenceToEdit ? "Save reference" : "Add reference"}
            context={{
              organizationId: infrastructure.organizationId,
              deviceId: device.id
            }}
            initialValues={accessReferenceToEdit ?? undefined}
          />
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Channel mappings</CardTitle>
              <CardDescription>
                Recorder assignments related to this device.
              </CardDescription>
            </div>
            {canWrite ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/sites/${device.site.id}`}>
                  Manage at site
                </Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {infrastructure.nvrAssignmentsAsNvr.length === 0 &&
            infrastructure.nvrAssignmentsAsCamera.length === 0 ? (
              <EmptyState
                title="No channel mappings"
                description="Use the site detail page to map NVR channels to installed cameras."
              />
            ) : (
              <>
                {infrastructure.nvrAssignmentsAsNvr.length > 0 ? (
                  <div className="space-y-3">
                    {infrastructure.nvrAssignmentsAsNvr.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="rounded-2xl border border-border/70 bg-background/30 px-4 py-4"
                      >
                        <p className="font-medium text-foreground">
                          Channel {assignment.channelNumber} · {assignment.cameraDevice.name}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {assignment.cameraDevice.ipAddress ?? "No IP set"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {infrastructure.nvrAssignmentsAsCamera.length > 0 ? (
                  <div className="space-y-3">
                    {infrastructure.nvrAssignmentsAsCamera.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="rounded-2xl border border-border/70 bg-background/30 px-4 py-4"
                      >
                        <p className="font-medium text-foreground">
                          {assignment.nvrDevice.name} · Channel {assignment.channelNumber}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Recording {assignment.recordingEnabled ? "enabled" : "disabled"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-sky-300" />
                Device links
              </CardTitle>
              <CardDescription>
                Upstream and downstream relationships tied to this device.
              </CardDescription>
            </div>
            {canWrite ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/sites/${device.site.id}`}>
                  Manage at site
                </Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {infrastructure.outgoingLinks.length === 0 &&
            infrastructure.incomingLinks.length === 0 ? (
              <EmptyState
                title="No device links"
                description="Use the site detail page to map uplinks, downstream devices, and PoE relationships."
              />
            ) : (
              <div className="space-y-3">
                {infrastructure.outgoingLinks.map((link) => (
                  <div
                    key={`outgoing-${link.id}`}
                    className="rounded-2xl border border-border/70 bg-background/30 px-4 py-4"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          Outgoing → {link.targetDevice.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {link.sourcePort ?? "No source port"} →{" "}
                          {link.targetPort ?? "No target port"}
                        </p>
                      </div>
                      <StatusBadge
                        tone={deviceLinkTypeTone(link.linkType)}
                        label={formatEnumLabel(link.linkType)}
                      />
                    </div>
                  </div>
                ))}

                {infrastructure.incomingLinks.map((link) => (
                  <div
                    key={`incoming-${link.id}`}
                    className="rounded-2xl border border-border/70 bg-background/30 px-4 py-4"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          Incoming ← {link.sourceDevice.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {link.sourcePort ?? "No source port"} →{" "}
                          {link.targetPort ?? "No target port"}
                        </p>
                      </div>
                      <StatusBadge
                        tone={deviceLinkTypeTone(link.linkType)}
                        label={formatEnumLabel(link.linkType)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
