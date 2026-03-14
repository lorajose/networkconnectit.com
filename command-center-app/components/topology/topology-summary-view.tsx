import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Camera,
  HardDrive,
  Network,
  Radio,
  Router,
  Server,
  ShieldCheck,
  ShieldOff,
  Unplug,
  Waypoints
} from "lucide-react";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import type { TopologyDeviceRecord, TopologyLayer, TopologyNvrGroup, TopologySnapshot } from "@/lib/management/topology";
import { formatEnumLabel, formatOptionalDateTime } from "@/lib/utils";

type TopologySummaryViewProps = {
  snapshot: TopologySnapshot;
  actions?: ReactNode;
};

function TopologyStatCard({
  label,
  value,
  helper
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <Card className="border-border/80 bg-card/70">
      <CardHeader className="pb-3">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {helper}
      </CardContent>
    </Card>
  );
}

function MetadataItem({
  label,
  value
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
        {label}
      </p>
      <div className="mt-1.5 text-sm text-foreground">{value}</div>
    </div>
  );
}

function DevicePill({ device }: { device: TopologyDeviceRecord }) {
  return (
    <Link
      href={device.href}
      className="rounded-2xl border border-border/70 bg-background/35 p-3 transition hover:border-sky-400/30 hover:bg-background/50"
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={device.statusTone} label={formatEnumLabel(device.status)} />
          {device.activeAlerts > 0 ? (
            <Badge variant="outline">{device.activeAlerts} active alerts</Badge>
          ) : null}
          <Badge variant="outline">{formatEnumLabel(device.monitoringMode)}</Badge>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{device.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatEnumLabel(device.type)}
            {device.brand ? ` · ${device.brand}` : ""}
            {device.model ? ` ${device.model}` : ""}
          </p>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>{device.ipAddress ?? device.hostname ?? "No IP or hostname recorded"}</p>
          <p>{device.siteName}</p>
          <p>
            Latest health:{" "}
            {device.latestHealthAt
              ? formatOptionalDateTime(device.latestHealthAt)
              : "No health activity"}
          </p>
        </div>
      </div>
    </Link>
  );
}

function LayerCard({ layer }: { layer: TopologyLayer }) {
  return (
    <Card className="border-border/80 bg-card/80">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{layer.title}</CardTitle>
        <CardDescription className="text-sm leading-6">
          {layer.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {layer.devices.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {layer.devices.map((device) => (
              <DevicePill key={device.id} device={device} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No devices are mapped in this infrastructure layer.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function NvrAssignmentCard({ group }: { group: TopologyNvrGroup }) {
  return (
    <Card className="border-border/80 bg-card/80">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-base">{group.nvr.name}</CardTitle>
          <StatusBadge tone={group.nvr.statusTone} label={formatEnumLabel(group.nvr.status)} />
          <Badge variant="outline">{group.assignments.length} channels</Badge>
        </div>
        <CardDescription className="text-sm leading-6">
          {group.nvr.siteName} · {group.nvr.ipAddress ?? group.nvr.hostname ?? "No management address"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {group.assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <Link
                  href={assignment.camera.href}
                  className="text-sm font-medium text-foreground hover:text-sky-200"
                >
                  {assignment.camera.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {assignment.camera.siteName} · {assignment.camera.ipAddress ?? assignment.camera.hostname ?? "No address"}
                </p>
                {assignment.notes ? (
                  <p className="text-xs text-muted-foreground">{assignment.notes}</p>
                ) : null}
              </div>
              <div className="space-y-2 text-right">
                <Badge variant="outline">Channel {assignment.channelNumber}</Badge>
                <StatusBadge
                  tone={assignment.camera.statusTone}
                  label={formatEnumLabel(assignment.camera.status)}
                />
                <p className="text-xs text-muted-foreground">
                  Recording {assignment.recordingEnabled ? "enabled" : "disabled"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TopologySummaryView({
  snapshot,
  actions
}: TopologySummaryViewProps) {
  const hasTopologyData =
    snapshot.summary.totalDevices > 0 ||
    snapshot.links.length > 0 ||
    snapshot.nvrGroups.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={snapshot.scope === "site" ? "Site Topology" : "Project Topology"}
        title={snapshot.title}
        description={snapshot.subtitle}
        breadcrumbs={snapshot.breadcrumbs}
        actions={actions}
      />

      <Card className="overflow-hidden border-border/80 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] shadow-panel">
        <CardContent className="grid gap-8 p-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.24em] text-sky-200/80">
                Technical Deployment Summary / Troubleshooting View
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge
                  tone={snapshot.summary.readinessTone}
                  label={snapshot.summary.readinessLabel}
                  withIcon
                />
                <Badge variant="outline">
                  {snapshot.summary.readinessScore}% coverage
                </Badge>
                <Badge variant="outline">
                  {snapshot.summary.linkedDevices} linked devices
                </Badge>
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {snapshot.name}
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                  Layered infrastructure summary for rapid commissioning review, support triage, and technical handoff.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <MetadataItem
                label="Organization"
                value={
                  <Link
                    href={snapshot.organization.href}
                    className="font-medium text-foreground hover:text-sky-200"
                  >
                    {snapshot.organization.name}
                  </Link>
                }
              />
              <MetadataItem
                label="Site"
                value={
                  snapshot.site ? (
                    <div className="space-y-1">
                      <Link
                        href={snapshot.site.href}
                        className="font-medium text-foreground hover:text-sky-200"
                      >
                        {snapshot.site.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {snapshot.site.location}
                      </p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Multiple linked sites</span>
                  )
                }
              />
              <MetadataItem
                label="Project"
                value={
                  snapshot.project ? (
                    <Link
                      href={snapshot.project.href}
                      className="font-medium text-foreground hover:text-sky-200"
                    >
                      {snapshot.project.name}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Site-scoped topology</span>
                  )
                }
              />
              <MetadataItem
                label="Primary gateway"
                value={
                  snapshot.summary.primaryGateway ? (
                    <div className="space-y-1">
                      <Link
                        href={snapshot.summary.primaryGateway.href}
                        className="font-medium text-foreground hover:text-sky-200"
                      >
                        {snapshot.summary.primaryGateway.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {snapshot.summary.primaryGateway.ipAddress ??
                          snapshot.summary.primaryGateway.hostname ??
                          "No address recorded"}
                      </p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No router inferred</span>
                  )
                }
              />
              <MetadataItem
                label="Active alerts"
                value={
                  <span className="inline-flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-300" />
                    {snapshot.summary.activeAlerts}
                  </span>
                }
              />
              <MetadataItem
                label="Offline devices"
                value={
                  <span className="inline-flex items-center gap-2">
                    <ShieldOff className="h-4 w-4 text-rose-300" />
                    {snapshot.summary.offlineDevices}
                  </span>
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-border/70 bg-background/30 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                Infrastructure mix
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground/70">
                    <Router className="h-3.5 w-3.5" />
                    Routers
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {snapshot.summary.routers}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground/70">
                    <Network className="h-3.5 w-3.5" />
                    Switches
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {snapshot.summary.switches}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground/70">
                    <HardDrive className="h-3.5 w-3.5" />
                    NVRs
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {snapshot.summary.nvrs}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground/70">
                    <Camera className="h-3.5 w-3.5" />
                    Cameras
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {snapshot.summary.cameras}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground/70">
                    <Radio className="h-3.5 w-3.5" />
                    Access points
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {snapshot.summary.accessPoints}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground/70">
                    <Server className="h-3.5 w-3.5" />
                    Other devices
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {snapshot.summary.otherDevices}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-background/30 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                Coverage indicators
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                  <span className="text-muted-foreground">Linked devices</span>
                  <span className="font-medium text-foreground">
                    {snapshot.summary.linkedDevices} / {snapshot.summary.totalDevices}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                  <span className="text-muted-foreground">Mapped cameras</span>
                  <span className="font-medium text-foreground">
                    {snapshot.summary.assignedCameras} / {snapshot.summary.cameras}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                  <span className="text-muted-foreground">Unlinked devices</span>
                  <span className="font-medium text-foreground">
                    {snapshot.summary.unlinkedDevices}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
                  <span className="text-muted-foreground">Unassigned cameras</span>
                  <span className="font-medium text-foreground">
                    {snapshot.summary.unassignedCameras}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TopologyStatCard
          label="Routers"
          value={snapshot.summary.routers}
          helper="Gateway devices currently represented in this topology scope."
        />
        <TopologyStatCard
          label="Switches"
          value={snapshot.summary.switches}
          helper="Switching devices available for uplink and PoE distribution."
        />
        <TopologyStatCard
          label="NVRs"
          value={snapshot.summary.nvrs}
          helper="Recorders currently linked into the deployment summary."
        />
        <TopologyStatCard
          label="Active Alerts"
          value={snapshot.summary.activeAlerts}
          helper="Open or acknowledged alerts affecting this topology scope."
        />
      </section>

      {!hasTopologyData ? (
        <EmptyState
          title="No topology data available"
          description="Add devices, relationships, and NVR assignments to build the operational topology summary for this scope."
          action={
            <div className="flex flex-wrap gap-3">
              {snapshot.site ? (
                <Button variant="outline" asChild>
                  <Link href={snapshot.site.href}>Back to site</Link>
                </Button>
              ) : null}
              {snapshot.project ? (
                <Button variant="outline" asChild>
                  <Link href={snapshot.project.href}>Back to project</Link>
                </Button>
              ) : null}
            </div>
          }
        />
      ) : (
        <>
          <section className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">
                Structured infrastructure layers
              </h3>
              <p className="text-sm text-muted-foreground">
                Readable layer-by-layer summary of gateway, switching, recording, edge, wireless, and supporting devices.
              </p>
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              {snapshot.layers.map((layer) => (
                <LayerCard key={layer.key} layer={layer} />
              ))}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="border-border/80 bg-card/80">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-lg">Device relationship summary</CardTitle>
                  <Badge variant="outline">{snapshot.links.length} links</Badge>
                </div>
                <CardDescription className="text-sm leading-6">
                  Physical and logical infrastructure relationships derived from DeviceLink records.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {snapshot.links.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border/70 bg-background/40 text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          <th className="px-4 py-3 font-medium">Source</th>
                          <th className="px-4 py-3 font-medium">Target</th>
                          <th className="px-4 py-3 font-medium">Link type</th>
                          <th className="px-4 py-3 font-medium">Ports</th>
                          <th className="px-4 py-3 font-medium">PoE</th>
                          <th className="px-4 py-3 font-medium">Site</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {snapshot.links.map((link) => (
                          <tr key={link.id}>
                            <td className="space-y-1 px-4 py-4 align-top">
                              <Link
                                href={link.sourceDevice.href}
                                className="font-medium text-foreground hover:text-sky-200"
                              >
                                {link.sourceDevice.name}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                {formatEnumLabel(link.sourceDevice.type)}
                              </p>
                            </td>
                            <td className="space-y-1 px-4 py-4 align-top">
                              <Link
                                href={link.targetDevice.href}
                                className="font-medium text-foreground hover:text-sky-200"
                              >
                                {link.targetDevice.name}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                {formatEnumLabel(link.targetDevice.type)}
                              </p>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <StatusBadge
                                tone={link.linkTone}
                                label={formatEnumLabel(link.linkType)}
                              />
                            </td>
                            <td className="px-4 py-4 align-top text-xs text-muted-foreground">
                              <p>{link.sourcePort ?? "—"} → {link.targetPort ?? "—"}</p>
                              {link.notes ? <p className="mt-1">{link.notes}</p> : null}
                            </td>
                            <td className="px-4 py-4 align-top text-xs text-muted-foreground">
                              {link.poeProvided === null
                                ? "Not specified"
                                : link.poeProvided
                                  ? "Provided"
                                  : "No"}
                            </td>
                            <td className="px-4 py-4 align-top">
                              <Link
                                href={link.siteHref}
                                className="text-xs text-muted-foreground hover:text-sky-200"
                              >
                                {link.siteName}
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No device relationships have been mapped for this topology scope yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/80">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-lg">Topology legend & warnings</CardTitle>
                  <Badge variant="outline">{snapshot.warnings.length} items</Badge>
                </div>
                <CardDescription className="text-sm leading-6">
                  Quick visual cues for device health, relationship coverage, and missing infrastructure.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone="healthy" label="Healthy" />
                  <StatusBadge tone="warning" label="Warning" />
                  <StatusBadge tone="critical" label="Critical" />
                  <StatusBadge tone="unknown" label="Unknown" />
                  <StatusBadge tone="info" label="Info" />
                </div>
                <div className="space-y-3">
                  {snapshot.warnings.map((warning) => (
                    <div
                      key={warning.id}
                      className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        {warning.tone === "healthy" ? (
                          <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
                        ) : warning.tone === "critical" ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-300" />
                        ) : warning.tone === "warning" ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
                        ) : (
                          <Activity className="mt-0.5 h-4 w-4 text-sky-300" />
                        )}
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {warning.title}
                          </p>
                          <p className="text-xs leading-5 text-muted-foreground">
                            {warning.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-border/80 bg-card/80">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-lg">NVR / camera assignment summary</CardTitle>
                  <Badge variant="outline">{snapshot.nvrGroups.length} NVR groups</Badge>
                </div>
                <CardDescription className="text-sm leading-6">
                  Recorder-to-camera channel mappings derived from NvrChannelAssignment records.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {snapshot.nvrGroups.length > 0 ? (
                  snapshot.nvrGroups.map((group) => (
                    <NvrAssignmentCard key={group.nvr.id} group={group} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No NVR channel assignments exist for the current topology scope.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-border/80 bg-card/80">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle className="text-lg">Unlinked devices</CardTitle>
                    <Badge variant="outline">{snapshot.unlinkedDevices.length}</Badge>
                  </div>
                  <CardDescription className="text-sm leading-6">
                    Devices present in inventory but not represented in any DeviceLink relationship.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {snapshot.unlinkedDevices.length > 0 ? (
                    snapshot.unlinkedDevices.map((device) => (
                      <div
                        key={device.id}
                        className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <Link
                              href={device.href}
                              className="text-sm font-medium text-foreground hover:text-sky-200"
                            >
                              {device.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {formatEnumLabel(device.type)} · {device.siteName}
                            </p>
                          </div>
                          <StatusBadge
                            tone={device.statusTone}
                            label={formatEnumLabel(device.status)}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Every device in scope is represented in at least one topology relationship.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/80">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle className="text-lg">Unassigned cameras</CardTitle>
                    <Badge variant="outline">{snapshot.unassignedCameras.length}</Badge>
                  </div>
                  <CardDescription className="text-sm leading-6">
                    Cameras that exist in the current scope but are not mapped to an NVR channel yet.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {snapshot.unassignedCameras.length > 0 ? (
                    snapshot.unassignedCameras.map((camera) => (
                      <div
                        key={camera.id}
                        className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <Link
                              href={camera.href}
                              className="text-sm font-medium text-foreground hover:text-sky-200"
                            >
                              {camera.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {camera.siteName} · {camera.ipAddress ?? camera.hostname ?? "No address"}
                            </p>
                          </div>
                          <div className="space-y-2 text-right">
                            <StatusBadge
                              tone={camera.statusTone}
                              label={formatEnumLabel(camera.status)}
                            />
                            <Badge variant="outline">Needs mapping</Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      All cameras in scope are assigned to an NVR channel.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
