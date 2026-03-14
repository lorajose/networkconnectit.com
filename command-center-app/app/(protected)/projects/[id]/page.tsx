import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertStatus,
  DeviceStatus,
  HealthStatus
} from "@prisma/client";
import { notFound } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  HardDrive,
  KeyRound,
  MapPinned,
  Network,
  Plus,
  Radar,
  ShieldCheck,
  Siren,
  Waypoints
} from "lucide-react";

import { createAccessReferenceAction, updateAccessReferenceAction } from "@/app/(protected)/infrastructure-actions";
import { unlinkProjectSiteAction } from "@/app/(protected)/projects/actions";
import { SummaryTable } from "@/components/dashboard/summary-table";
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
import { requireRoles } from "@/lib/auth";
import { getRecentAlertsForScope } from "@/lib/management/alerts";
import { getProjectHealthTimeline } from "@/lib/management/health";
import { getProjectDetail } from "@/lib/management/projects";
import { getSearchParamValue } from "@/lib/management/search-params";
import {
  canAcknowledgeAlerts,
  canResolveAlerts,
  canWriteTenantInventory,
  routeAccess
} from "@/lib/rbac";
import {
  deviceLinkTypeTone,
  deviceStatusTone,
  healthStatusTone,
  projectInstallationStatusTone,
  projectPriorityTone,
  siteStatusTone
} from "@/lib/status";
import {
  formatDate,
  formatEnumLabel,
  formatLocation,
  formatOptionalDateTime
} from "@/lib/utils";

type ProjectDetailPageProps = {
  params: {
    id: string;
  };
  searchParams?: Record<string, string | string[] | undefined>;
};

type ProjectDetailRecord = NonNullable<Awaited<ReturnType<typeof getProjectDetail>>>;
type AccessReferenceRecord = ProjectDetailRecord["accessReferences"][number];
type ReadinessItem = ProjectDetailRecord["readiness"]["items"][number];

type SectionLink = {
  id: string;
  label: string;
  Icon: typeof Boxes;
};

const sectionLinks: SectionLink[] = [
  {
    id: "summary",
    label: "Project summary",
    Icon: Boxes
  },
  {
    id: "sites",
    label: "Linked sites",
    Icon: MapPinned
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    Icon: Network
  },
  {
    id: "network-segments",
    label: "Network segments",
    Icon: Radar
  },
  {
    id: "access",
    label: "Access refs",
    Icon: KeyRound
  },
  {
    id: "recording",
    label: "NVR mapping",
    Icon: HardDrive
  },
  {
    id: "topology",
    label: "Topology",
    Icon: Waypoints
  },
  {
    id: "readiness",
    label: "Readiness",
    Icon: ShieldCheck
  },
  {
    id: "operations",
    label: "Alerts & health",
    Icon: Siren
  }
];

function getStatusCount(
  counts: Array<{ status: DeviceStatus; _count: { _all: number } }>,
  status: DeviceStatus
) {
  return counts.find((entry) => entry.status === status)?._count._all ?? 0;
}

function ProjectMetricCard({
  label,
  value,
  description
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <Card className="border-border/80 bg-card/70">
      <CardHeader className="pb-3">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {description}
      </CardContent>
    </Card>
  );
}

function MetadataItem({
  label,
  value
}: {
  label: string;
  value: ReactNode;
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

function ReadinessRow({ item }: { item: ReadinessItem }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-foreground">{item.label}</p>
          <p className="text-sm text-muted-foreground">{item.description}</p>
        </div>
        <div className="space-y-2 sm:text-right">
          <StatusBadge
            tone={item.tone}
            label={item.value}
            withIcon
            className="justify-center sm:justify-start"
          />
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">
            {item.status === "ready"
              ? "Ready"
              : item.status === "warning"
                ? "Needs review"
                : item.status === "missing"
                  ? "Missing"
                  : "Not required"}
          </p>
        </div>
      </div>
    </div>
  );
}

function getAccessReferenceScope(reference: AccessReferenceRecord) {
  if (reference.device) {
    return `Device · ${reference.device.name}`;
  }

  if (reference.site) {
    return `Site · ${reference.site.name}`;
  }

  if (reference.projectInstallationId) {
    return "Project";
  }

  return "Organization";
}

export default async function ProjectDetailPage({
  params,
  searchParams = {}
}: ProjectDetailPageProps) {
  const user = await requireRoles(routeAccess.projects);
  const project = await getProjectDetail(user, params.id);

  if (!project) {
    notFound();
  }

  const [recentAlerts, recentHealthTimeline] = await Promise.all([
    getRecentAlertsForScope(user, {
      projectInstallationId: project.id,
      limit: 8
    }),
    getProjectHealthTimeline(user, project.id, 12)
  ]);

  const canWrite = canWriteTenantInventory(user.role);
  const editAccessReferenceId = getSearchParamValue(searchParams.editAccessReference);
  const accessReferenceToEdit = editAccessReferenceId
    ? project.accessReferences.find((reference) => reference.id === editAccessReferenceId)
    : null;
  const accessReferenceAction = accessReferenceToEdit
    ? updateAccessReferenceAction.bind(
        null,
        accessReferenceToEdit.id,
        `/projects/${project.id}`
      )
    : createAccessReferenceAction.bind(null, `/projects/${project.id}`);
  const accessReferenceContext = accessReferenceToEdit
    ? {
        organizationId: project.organizationId,
        siteId: accessReferenceToEdit.siteId ?? null,
        projectInstallationId: accessReferenceToEdit.projectInstallationId ?? null,
        deviceId: accessReferenceToEdit.deviceId ?? null
      }
    : {
        organizationId: project.organizationId,
        projectInstallationId: project.id
      };
  const monitoringCoveragePct =
    project._count.devices > 0
      ? Math.round((project.monitoringReadyDevicesCount / project._count.devices) * 100)
      : 0;
  const healthyDevices = getStatusCount(project.deviceStatuses, DeviceStatus.ONLINE);
  const offlineDevices = getStatusCount(project.deviceStatuses, DeviceStatus.OFFLINE);
  const recentWarnings = recentAlerts
    .filter((alert) => alert.status !== AlertStatus.RESOLVED)
    .slice(0, 4);
  const recentHealthIssues = recentHealthTimeline
    .filter((entry) => entry.status !== HealthStatus.HEALTHY)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Installation Record"
        title={project.name}
        description="Commissioning status, linked infrastructure, secure access documentation, and active operational posture for this deployment."
        breadcrumbs={[
          {
            label: "Command Center",
            href: "/dashboard"
          },
          {
            label: "Projects",
            href: "/projects"
          },
          {
            label: project.name
          }
        ]}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href={`/organizations/${project.organization.id}`}>Organization</Link>
            </Button>
            {project.primarySite ? (
              <Button variant="outline" asChild>
                <Link href={`/sites/${project.primarySite.id}`}>Primary site</Link>
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link href={`/projects/${project.id}/export`}>Export Project PDF</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/projects/${project.id}/capacity`}>View capacity</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/projects/${project.id}/topology`}>View topology</Link>
            </Button>
            {canWrite ? (
              <Button asChild>
                <Link href={`/projects/${project.id}/edit`}>Edit installation</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <Card className="overflow-hidden border-border/80 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] shadow-panel">
        <CardContent className="grid gap-8 p-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.24em] text-sky-200/80">
                Installation Record / Site Commissioning Console
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {project.projectCode ? (
                  <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-sky-200">
                    {project.projectCode}
                  </span>
                ) : null}
                <StatusBadge
                  tone={projectInstallationStatusTone(project.status)}
                  label={formatEnumLabel(project.status)}
                  withIcon
                />
                <StatusBadge
                  tone={projectPriorityTone(project.priority)}
                  label={`${formatEnumLabel(project.priority)} priority`}
                />
                <StatusBadge
                  tone={project.monitoringReady ? "healthy" : "warning"}
                  label={project.monitoringReady ? "Monitoring ready" : "Monitoring pending"}
                  withIcon
                />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {project.name}
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                  {project.scopeSummary ??
                    "Use this record to track real-world deployment scope, infrastructure, access readiness, and support handoff context."}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl border border-sky-500/15 bg-slate-950/35 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Organization
                </p>
                <Link
                  href={`/organizations/${project.organization.id}`}
                  className="mt-2 block text-lg font-semibold text-white transition hover:text-sky-200"
                >
                  {project.organization.name}
                </Link>
                <p className="mt-1 text-sm text-slate-400">
                  {project.projectType === "MANAGED_HANDOFF"
                    ? "Managed handoff / support-ready installation"
                    : `${formatEnumLabel(project.projectType)} lifecycle record`}
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-500/15 bg-slate-950/35 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Readiness state
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <StatusBadge
                    tone={project.readiness.tone}
                    label={project.readiness.label}
                    withIcon
                  />
                  <span className="text-2xl font-semibold text-white">
                    {project.readiness.score}%
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  {project.readiness.summary}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-slate-950/30 px-5 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Remote access method
                  </p>
                  <p className="mt-2 text-sm text-slate-100">
                    {project.remoteAccessMethod ?? "Not documented yet"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Vendor systems planned
                  </p>
                  <p className="mt-2 text-sm text-slate-100">
                    {project.vendorSystemsPlanned ?? "No vendor systems listed"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Internal notes
                  </p>
                  <p className="mt-2 text-sm text-slate-100">
                    {project.internalNotes ?? "No internal notes recorded"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Client-facing notes
                  </p>
                  <p className="mt-2 text-sm text-slate-100">
                    {project.clientFacingNotes ?? "No client-facing notes recorded"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetadataItem
              label="Primary site"
              value={
                project.primarySite ? (
                  <Link
                    href={`/sites/${project.primarySite.id}`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {project.primarySite.name}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {formatLocation([
                        project.primarySite.city,
                        project.primarySite.country
                      ])}
                    </span>
                  </Link>
                ) : (
                  "Not assigned"
                )
              }
            />
            <MetadataItem
              label="Handoff status"
              value={formatEnumLabel(project.handoffStatus)}
            />
            <MetadataItem
              label="Installation date"
              value={
                project.installationDate
                  ? formatDate(project.installationDate)
                  : "Not scheduled"
              }
            />
            <MetadataItem
              label="Go-live date"
              value={project.goLiveDate ? formatDate(project.goLiveDate) : "Not scheduled"}
            />
            <MetadataItem
              label="Internal PM"
              value={project.internalProjectManager ?? "Not assigned"}
            />
            <MetadataItem
              label="Lead technician"
              value={project.leadTechnician ?? "Not assigned"}
            />
            <MetadataItem
              label="Sales owner"
              value={project.salesOwner ?? "Not assigned"}
            />
            <MetadataItem
              label="Client contact"
              value={
                <>
                  <p>{project.clientContactName ?? "Not set"}</p>
                  <p className="text-xs text-muted-foreground">
                    {project.clientContactEmail ?? "No email"} ·{" "}
                    {project.clientContactPhone ?? "No phone"}
                  </p>
                </>
              }
            />
            <MetadataItem
              label="Warranty window"
              value={
                project.warrantyStartAt || project.warrantyEndAt ? (
                  <>
                    <p>{project.warrantyStartAt ? formatDate(project.warrantyStartAt) : "Start TBD"}</p>
                    <p className="text-xs text-muted-foreground">
                      {project.warrantyEndAt ? `Ends ${formatDate(project.warrantyEndAt)}` : "End TBD"}
                    </p>
                  </>
                ) : (
                  "Not recorded"
                )
              }
            />
            <MetadataItem
              label="External reference"
              value={project.externalReference ?? "Not set"}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/70">
        <CardContent className="flex flex-wrap gap-2 p-4">
          {sectionLinks.map(({ id, label, Icon }) => (
            <Button key={id} variant="outline" size="sm" asChild>
              <a href={`#${id}`} className="gap-2">
                <Icon className="h-4 w-4" />
                {label}
              </a>
            </Button>
          ))}
        </CardContent>
      </Card>

      <section id="summary" className="space-y-4 scroll-mt-28">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          <ProjectMetricCard
            label="Linked sites"
            value={project._count.projectSites}
            description="Persistent site records participating in this installation."
          />
          <ProjectMetricCard
            label="Linked devices"
            value={project._count.devices}
            description="Devices explicitly assigned to the installation scope."
          />
          <ProjectMetricCard
            label="Total cameras"
            value={project.totalCameras}
            description="Camera endpoints recorded for the commissioned environment."
          />
          <ProjectMetricCard
            label="Total NVRs"
            value={project.totalNvrs}
            description="Recording nodes retained inside this deployment record."
          />
          <ProjectMetricCard
            label="Total switches"
            value={project.totalSwitches}
            description="Switching infrastructure currently mapped into the project."
          />
          <ProjectMetricCard
            label="Active alerts"
            value={project.activeAlertsCount}
            description="Open or acknowledged issues across linked sites and devices."
          />
          <ProjectMetricCard
            label="Healthy devices"
            value={healthyDevices}
            description="Devices currently reporting healthy / online state."
          />
          <ProjectMetricCard
            label="Offline devices"
            value={offlineDevices}
            description="Devices currently marked offline and requiring follow-up."
          />
        </div>
      </section>

      <section id="sites" className="scroll-mt-28">
        <SummaryTable
          title="Linked sites"
          description="Persistent locations attached to this installation, with site-level health, alerts, and device context."
          headers={[
            "Site",
            "Location",
            "Phase",
            "Status",
            "Devices",
            "Active alerts",
            "Health summary",
            "Monitoring",
            "Actions"
          ]}
          rowCount={project.projectSites.length}
          emptyTitle="No sites linked yet"
          emptyDescription="Use edit project to attach one or more existing sites to this installation record."
        >
          {project.projectSites.map((projectSite) => {
            const unlinkAction = unlinkProjectSiteAction.bind(
              null,
              project.id,
              projectSite.id,
              `/projects/${project.id}`
            );

            return (
              <tr key={projectSite.id} className="align-top">
                <td className="px-4 py-4 sm:px-5">
                  <div className="space-y-1">
                    <Link
                      href={`/sites/${projectSite.site.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {projectSite.site.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Added {formatDate(projectSite.createdAt)}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-4 text-muted-foreground sm:px-5">
                  {formatLocation([
                    projectSite.site.city,
                    projectSite.site.country
                  ])}
                </td>
                <td className="px-4 py-4 text-muted-foreground sm:px-5">
                  {projectSite.roleOrPhase ?? "Primary deployment"}
                </td>
                <td className="px-4 py-4 sm:px-5">
                  <StatusBadge
                    tone={siteStatusTone(projectSite.site.status)}
                    label={formatEnumLabel(projectSite.site.status)}
                  />
                </td>
                <td className="px-4 py-4 text-muted-foreground sm:px-5">
                  <div className="space-y-1">
                    <p>{projectSite.site.deviceCount} linked</p>
                    <p className="text-xs">
                      {projectSite.site.cameraCount} cameras
                    </p>
                  </div>
                </td>
                <td className="px-4 py-4 sm:px-5">
                  <StatusBadge
                    tone={
                      projectSite.site.activeAlertsCount > 0 ? "warning" : "healthy"
                    }
                    label={
                      projectSite.site.activeAlertsCount > 0
                        ? `${projectSite.site.activeAlertsCount} active`
                        : "Clear"
                    }
                  />
                </td>
                <td className="px-4 py-4 sm:px-5">
                  <div className="space-y-2">
                    <StatusBadge
                      tone={projectSite.site.healthSummary.health}
                      label={projectSite.site.healthSummary.label}
                      withIcon
                    />
                    <p className="text-xs text-muted-foreground">
                      {projectSite.site.healthSummary.onlineCount} online ·{" "}
                      {projectSite.site.healthSummary.warningCount} warning ·{" "}
                      {projectSite.site.healthSummary.offlineCount} offline
                    </p>
                  </div>
                </td>
                <td className="px-4 py-4 text-muted-foreground sm:px-5">
                  <div className="space-y-1">
                    <p>
                      {projectSite.site.monitoringReadyCount}/{projectSite.site.deviceCount}
                    </p>
                    <p className="text-xs">
                      Last check{" "}
                      {formatOptionalDateTime(
                        projectSite.site.healthSummary.lastCheckAt
                      )}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-4 sm:px-5">
                  <div className="flex flex-col items-start gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/sites/${projectSite.site.id}`}>
                        View site
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    {canWrite ? (
                      <form action={unlinkAction}>
                        <Button variant="outline" size="sm" type="submit">
                          Unlink
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </SummaryTable>
      </section>

      <section id="infrastructure" className="grid gap-6 scroll-mt-28 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-border/80 bg-card/70">
          <CardHeader>
            <CardTitle>Infrastructure overview</CardTitle>
            <CardDescription>
              Grouped summary of installed infrastructure mapped into this project record.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {project.infrastructureSummary.map((group) => (
              <div
                key={group.key}
                className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                      {group.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {group.count}
                    </p>
                  </div>
                  <StatusBadge
                    tone={group.tone}
                    label={group.count > 0 ? "In scope" : "None"}
                  />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {group.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Installed asset roster</CardTitle>
              <CardDescription>
                Preview of devices explicitly assigned to this project installation.
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
            {project.devices.length === 0 ? (
              <EmptyState
                title="No project devices linked"
                description="Assign devices to this project from device create or edit flows."
              />
            ) : (
              <div className="space-y-3">
                {project.devices.map((device) => (
                  <div
                    key={device.id}
                    className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <Link
                          href={`/devices/${device.id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {device.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {formatEnumLabel(device.type)} · {device.site.name}
                          {device.hostname ? ` · ${device.hostname}` : ""}
                          {device.ipAddress ? ` · ${device.ipAddress}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Firmware: {device.firmwareVersion ?? "Not recorded"} · Last seen{" "}
                          {formatOptionalDateTime(device.lastSeenAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge
                          tone={deviceStatusTone(device.status)}
                          label={formatEnumLabel(device.status)}
                        />
                        <StatusBadge
                          tone={
                            device.monitoringMode === "MANUAL" ? "warning" : "healthy"
                          }
                          label={formatEnumLabel(device.monitoringMode)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {project._count.devices > project.devices.length ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Showing {project.devices.length} of {project._count.devices} linked devices.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section id="network-segments" className="scroll-mt-28">
        <SummaryTable
          title="Network segments"
          description="VLAN and subnet inventory across all sites attached to this installation."
          headers={["Segment", "Related site", "Gateway", "Purpose", "Linked devices", "Notes"]}
          rowCount={project.networkSegments.length}
          emptyTitle="No network segments recorded"
          emptyDescription="Add VLAN or subnet records from linked site detail pages."
        >
          {project.networkSegments.map((segment) => (
            <tr key={segment.id} className="align-top">
              <td className="px-4 py-4 sm:px-5">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {segment.name}
                    {segment.vlanId ? ` · VLAN ${segment.vlanId}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{segment.subnetCidr}</p>
                </div>
              </td>
              <td className="px-4 py-4 text-muted-foreground sm:px-5">
                <Link href={`/sites/${segment.site.id}`} className="hover:text-foreground">
                  {segment.site.name}
                </Link>
              </td>
              <td className="px-4 py-4 text-muted-foreground sm:px-5">
                {segment.gatewayIp ?? "Not recorded"}
              </td>
              <td className="px-4 py-4 text-muted-foreground sm:px-5">
                {segment.purpose ?? "General purpose"}
              </td>
              <td className="px-4 py-4 text-muted-foreground sm:px-5">
                {segment._count.devices}
              </td>
              <td className="px-4 py-4 text-muted-foreground sm:px-5">
                {segment.notes ?? "No notes"}
              </td>
            </tr>
          ))}
        </SummaryTable>
      </section>

      <section id="access" className="grid gap-6 scroll-mt-28 xl:grid-cols-[1.25fr_0.95fr]">
        <SummaryTable
          title="Access references"
          description="Secure deployment documentation for project-, site-, and device-level access without storing raw credentials."
          headers={[
            "Reference",
            "Scope",
            "Vault",
            "Owner",
            "Remote access",
            "Last validated",
            "Actions"
          ]}
          rowCount={project.accessReferences.length}
          emptyTitle="No access references yet"
          emptyDescription="Add vault paths or safe access notes for project, site, or device scope."
        >
          {project.accessReferences.map((reference) => (
            <tr key={reference.id} className="align-top">
              <td className="px-4 py-4 sm:px-5">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{reference.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatEnumLabel(reference.accessType)}
                  </p>
                </div>
              </td>
              <td className="px-4 py-4 text-muted-foreground sm:px-5">
                {getAccessReferenceScope(reference)}
              </td>
              <td className="px-4 py-4 text-muted-foreground sm:px-5">
                {reference.vaultProvider || reference.vaultPath ? (
                  <div className="space-y-1">
                    <p>{reference.vaultProvider ?? "Vault"}</p>
                    <p className="text-xs">{reference.vaultPath ?? "Path not set"}</p>
                  </div>
                ) : (
                  "Not recorded"
                )}
              </td>
              <td className="px-4 py-4 text-muted-foreground sm:px-5">
                {reference.owner ?? "Not set"}
              </td>
              <td className="px-4 py-4 text-muted-foreground sm:px-5">
                {reference.remoteAccessMethod ?? "Not documented"}
              </td>
              <td className="px-4 py-4 text-muted-foreground sm:px-5">
                {formatOptionalDateTime(reference.lastValidatedAt)}
              </td>
              <td className="px-4 py-4 sm:px-5">
                {canWrite ? (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/projects/${project.id}?editAccessReference=${reference.id}`}>
                      Edit
                    </Link>
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Read only</span>
                )}
              </td>
            </tr>
          ))}
        </SummaryTable>

        {canWrite ? (
          <AccessReferenceForm
            title={
              accessReferenceToEdit ? "Edit access reference" : "Add project access reference"
            }
            description="Store vault locations, owners, and remote-access instructions without saving plaintext secrets."
            action={accessReferenceAction}
            submitLabel={accessReferenceToEdit ? "Save reference" : "Add reference"}
            context={accessReferenceContext}
            initialValues={accessReferenceToEdit ?? undefined}
          />
        ) : null}
      </section>

      <section id="recording" className="scroll-mt-28">
        <SummaryTable
          title="NVR / camera mapping"
          description="Recorder channel assignments for cameras included in this installation."
          headers={[
            "Recorder",
            "Camera",
            "Channel",
            "Recording",
            "Site",
            "Notes"
          ]}
          rowCount={project.nvrChannelAssignments.length}
          emptyTitle="No NVR mappings recorded"
          emptyDescription="Map recorder channels from site detail pages once NVRs and cameras are assigned."
        >
          {project.nvrChannelAssignments.map((assignment) => (
            <tr key={assignment.id} className="align-top">
              <td className="px-4 py-4 sm:px-5">
                <Link
                  href={`/devices/${assignment.nvrDevice.id}`}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {assignment.nvrDevice.name}
                </Link>
              </td>
              <td className="px-4 py-4 sm:px-5">
                <div className="space-y-1">
                  <Link
                    href={`/devices/${assignment.cameraDevice.id}`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {assignment.cameraDevice.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {assignment.cameraDevice.site.name}
                  </p>
                </div>
              </td>
              <td className="px-4 py-4 text-muted-foreground sm:px-5">
                {assignment.channelNumber}
              </td>
              <td className="px-4 py-4 sm:px-5">
                <StatusBadge
                  tone={assignment.recordingEnabled ? "healthy" : "warning"}
                  label={assignment.recordingEnabled ? "Enabled" : "Disabled"}
                />
              </td>
              <td className="px-4 py-4 text-muted-foreground sm:px-5">
                {assignment.site.name}
                <span className="block text-xs">
                  {formatLocation([assignment.site.city, assignment.site.country])}
                </span>
              </td>
              <td className="px-4 py-4 text-muted-foreground sm:px-5">
                {assignment.notes ?? "No notes"}
              </td>
            </tr>
          ))}
        </SummaryTable>
      </section>

      <section id="topology" className="scroll-mt-28">
        <SummaryTable
          title="Device topology / relationship summary"
          description="Structured device links for uplinks, downstream ports, recording paths, and PoE relationships."
          headers={[
            "Source device",
            "Target device",
            "Link type",
            "Ports",
            "PoE",
            "Site context",
            "Notes"
          ]}
          rowCount={project.deviceLinks.length}
          emptyTitle="No topology links recorded"
          emptyDescription="Map router, switch, AP, NVR, and camera relationships from linked site detail pages."
        >
          {project.deviceLinks.map((link) => (
            <tr key={link.id} className="align-top">
              <td className="px-4 py-4 sm:px-5">
                <div className="space-y-1">
                  <Link
                    href={`/devices/${link.sourceDevice.id}`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {link.sourceDevice.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatEnumLabel(link.sourceDevice.type)}
                  </p>
                </div>
              </td>
              <td className="px-4 py-4 sm:px-5">
                <div className="space-y-1">
                  <Link
                    href={`/devices/${link.targetDevice.id}`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {link.targetDevice.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatEnumLabel(link.targetDevice.type)}
                  </p>
                </div>
              </td>
              <td className="px-4 py-4 sm:px-5">
                <StatusBadge
                  tone={deviceLinkTypeTone(link.linkType)}
                  label={formatEnumLabel(link.linkType)}
                />
              </td>
              <td className="px-4 py-4 text-muted-foreground sm:px-5">
                {link.sourcePort ?? "Source n/a"} → {link.targetPort ?? "Target n/a"}
              </td>
              <td className="px-4 py-4 sm:px-5">
                {typeof link.poeProvided === "boolean" ? (
                  <StatusBadge
                    tone={link.poeProvided ? "healthy" : "warning"}
                    label={link.poeProvided ? "PoE" : "No PoE"}
                  />
                ) : (
                  <span className="text-muted-foreground">Not specified</span>
                )}
              </td>
              <td className="px-4 py-4 text-muted-foreground sm:px-5">
                {link.site.name}
                <span className="block text-xs">
                  {formatLocation([link.site.city, link.site.country])}
                </span>
              </td>
              <td className="px-4 py-4 text-muted-foreground sm:px-5">
                {link.notes ?? "No notes"}
              </td>
            </tr>
          ))}
        </SummaryTable>
      </section>

      <section id="readiness" className="space-y-6 scroll-mt-28">
        <Card className="border-border/80 bg-card/70">
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <CardTitle>Monitoring readiness</CardTitle>
                <CardDescription>
                  Operational checklist for deciding whether this project is fully onboarded and ready for managed support.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge
                  tone={project.readiness.tone}
                  label={project.readiness.label}
                  withIcon
                />
                <span className="text-3xl font-semibold text-foreground">
                  {project.readiness.score}%
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Checklist progress
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {project.readiness.completedCount}/{project.readiness.applicableCount}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Monitoring coverage
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {monitoringCoveragePct}%
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Secure access refs
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {project.accessReferencesCount}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Telemetry history
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {project.healthChecksCount}
                </p>
              </div>
            </div>

            {(project.readiness.blockers.length > 0 || project.readiness.warnings.length > 0) ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/8 px-4 py-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-300" />
                    <p className="font-medium text-rose-100">Blocking gaps</p>
                  </div>
                  {project.readiness.blockers.length === 0 ? (
                    <p className="mt-2 text-sm text-rose-100/80">
                      No blocking onboarding gaps are currently recorded.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-sm text-rose-100/85">
                      {project.readiness.blockers.map((item) => (
                        <li key={item.key}>
                          {item.label}: {item.value}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-amber-200" />
                    <p className="font-medium text-amber-100">Items needing review</p>
                  </div>
                  {project.readiness.warnings.length === 0 ? (
                    <p className="mt-2 text-sm text-amber-100/80">
                      No soft warnings are currently flagged for this project.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-sm text-amber-100/85">
                      {project.readiness.warnings.map((item) => (
                        <li key={item.key}>
                          {item.label}: {item.value}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              {project.readiness.items.map((item) => (
                <ReadinessRow key={item.key} item={item} />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="operations" className="space-y-6 scroll-mt-28">
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr_1.05fr]">
          <Card className="border-border/80 bg-card/70">
            <CardHeader>
              <CardTitle>Project alerts and telemetry</CardTitle>
              <CardDescription>
                Current incident load and recent monitoring activity affecting this installation.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Active alerts
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {project.activeAlertsCount}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Critical blockers
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {project.activeCriticalAlertsCount}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Acknowledged alerts
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {project.acknowledgedAlertsCount}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Last monitoring activity
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {formatOptionalDateTime(project.latestMonitoringActivityAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Siren className="h-5 w-5 text-rose-300" />
                Latest project-impacting warnings
              </CardTitle>
              <CardDescription>
                Recent open or acknowledged alerts that still affect project operations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentWarnings.length === 0 ? (
                <EmptyState
                  title="No active warnings"
                  description="There are no unresolved project alerts in the current scope."
                />
              ) : (
                <div className="space-y-3">
                  {recentWarnings.map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <Link
                            href={`/alerts/${alert.id}`}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {alert.title}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {alert.site?.name ?? "Unassigned site"}
                            {alert.device ? ` · ${alert.device.name}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatOptionalDateTime(alert.createdAt)}
                          </p>
                        </div>
                        <StatusBadge
                          tone={alert.status === "OPEN" ? "critical" : "warning"}
                          label={formatEnumLabel(alert.status)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-sky-300" />
                Recent health issues
              </CardTitle>
              <CardDescription>
                Latest warning or critical health events across devices assigned to this project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentHealthIssues.length === 0 ? (
                <EmptyState
                  title="No health issues"
                  description="Recent monitoring activity is healthy or not yet populated for this scope."
                />
              ) : (
                <div className="space-y-3">
                  {recentHealthIssues.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <Link
                            href={`/devices/${entry.deviceId}`}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {entry.deviceName}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {entry.siteName} · {formatEnumLabel(entry.checkType)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.message ?? "No message"} · {formatOptionalDateTime(entry.checkedAt)}
                          </p>
                        </div>
                        <StatusBadge
                          tone={healthStatusTone(entry.status)}
                          label={formatEnumLabel(entry.status)}
                          withIcon
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <AlertRecordsTable
            title="Recent project alerts"
            description="Recent alert activity across all linked sites and project devices."
            alerts={recentAlerts}
            redirectTo={`/projects/${project.id}`}
            showOrganization={false}
            canAcknowledge={canAcknowledgeAlerts(user.role)}
            canResolve={canResolveAlerts(user.role)}
          />

          <HealthTimelineTable
            title="Recent monitoring activity"
            description="Latest health checks captured for project devices and linked site infrastructure."
            entries={recentHealthTimeline}
            showOrganization={false}
          />
        </div>
      </section>
    </div>
  );
}
