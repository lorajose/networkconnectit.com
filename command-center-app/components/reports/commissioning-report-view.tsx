import Image from "next/image";
import type { ReactNode } from "react";
import { Activity, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

import { ReportExportToolbar } from "@/components/reports/report-export-toolbar";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { CommissioningReportSnapshot, ReportReadinessItem } from "@/lib/management/commissioning-report";
import {
  projectInstallationStatusTone,
  projectPriorityTone,
  siteStatusTone
} from "@/lib/status";
import { formatDate, formatEnumLabel, formatOptionalDateTime } from "@/lib/utils";

type CommissioningReportViewProps = {
  report: CommissioningReportSnapshot;
};

function formatWatts(value: number | null) {
  if (value === null) {
    return "Not defined";
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 1
  }).format(value)} W`;
}

function formatBoolean(value: boolean | null | undefined) {
  if (value === null || value === undefined) {
    return "Not set";
  }

  return value ? "Yes" : "No";
}

function Section({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="break-inside-avoid rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description ? (
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <div className="mt-1.5 text-sm text-slate-900">{value}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  helper
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-600">{helper}</p>
    </div>
  );
}

function TableWrap({
  children
}: {
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function Table({
  children
}: {
  children: ReactNode;
}) {
  return (
    <table className="min-w-full divide-y divide-slate-200 text-sm">
      {children}
    </table>
  );
}

function HeadCell({ children }: { children: ReactNode }) {
  return (
    <th className="bg-slate-50 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
      {children}
    </th>
  );
}

function BodyCell({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 align-top text-slate-700">{children}</td>;
}

function ReadinessRow({ item }: { item: ReportReadinessItem }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-slate-900">{item.label}</p>
          <p className="text-sm text-slate-600">{item.description}</p>
        </div>
        <div className="space-y-2 sm:text-right">
          <StatusBadge tone={item.tone} label={item.value} withIcon />
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
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

export function CommissioningReportView({
  report
}: CommissioningReportViewProps) {
  const backHref =
    report.scope === "project" && report.project
      ? report.project.href
      : report.site?.href ?? "/dashboard";
  const backLabel =
    report.scope === "project" ? "Back to installation" : "Back to site";

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white">
      <ReportExportToolbar backHref={backHref} backLabel={backLabel} />

      <main className="px-4 py-6 print:p-0 sm:px-6">
        <article className="mx-auto flex max-w-6xl flex-col gap-6 rounded-[2rem] bg-white p-6 text-slate-900 shadow-2xl print:max-w-none print:rounded-none print:p-8 print:shadow-none">
          <section className="break-inside-avoid overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_34%),linear-gradient(135deg,#ffffff,#f8fafc)] p-8">
            <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <Image
                    src="/img/networkconnectit-logo.png"
                    alt="NetworkConnectIT"
                    width={220}
                    height={60}
                    priority
                    className="h-12 w-auto"
                  />
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.26em] text-sky-700">
                      NetworkConnectIT Security Command Center
                    </p>
                    <p className="text-sm text-slate-600">
                      Commissioning / Handoff Export
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge
                      tone={report.readiness.tone}
                      label={report.readiness.label}
                      withIcon
                    />
                    <StatusBadge
                      tone={
                        report.infrastructureSummary.activeAlerts > 0
                          ? "warning"
                          : "healthy"
                      }
                      label={`${report.infrastructureSummary.activeAlerts} active alerts`}
                    />
                  </div>
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                      {report.reportTitle}
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                      {report.scope === "project"
                        ? "Client-ready installation record for commissioning, handoff, managed monitoring onboarding, and maintenance reference."
                        : "Site-focused commissioning record for field verification, support handoff, and ongoing operational documentation."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:min-w-[320px]">
                <MetadataItem label="Organization" value={report.organization.name} />
                <MetadataItem
                  label={report.scope === "project" ? "Installation" : "Site"}
                  value={report.project?.name ?? report.site?.name ?? "Unknown"}
                />
                <MetadataItem
                  label="Generated"
                  value={`${formatDate(report.generatedAt)} by ${report.generatedBy}`}
                />
                <MetadataItem
                  label="Readiness"
                  value={`${report.readiness.score}% · ${report.readiness.label}`}
                />
              </div>
            </div>
          </section>

          <Section
            title="Project / Site Summary"
            description="Identity, client ownership, commissioning dates, handoff state, and internal delivery ownership."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <MetadataItem label="Organization" value={report.organization.name} />
                {report.project ? (
                  <MetadataItem
                    label="Project code"
                    value={report.project.projectCode ?? "Not assigned"}
                  />
                ) : null}
                {report.project ? (
                  <MetadataItem
                    label="Project status"
                    value={
                      <StatusBadge
                        tone={projectInstallationStatusTone(report.project.status as never)}
                        label={formatEnumLabel(report.project.status)}
                      />
                    }
                  />
                ) : report.site ? (
                  <MetadataItem
                    label="Site status"
                    value={
                      <StatusBadge
                        tone={siteStatusTone(report.site.status as never)}
                        label={formatEnumLabel(report.site.status)}
                      />
                    }
                  />
                ) : null}
                {report.project ? (
                  <MetadataItem
                    label="Project type"
                    value={formatEnumLabel(report.project.projectType)}
                  />
                ) : null}
                {report.project ? (
                  <MetadataItem
                    label="Priority"
                    value={
                      <StatusBadge
                        tone={projectPriorityTone(report.project.priority as never)}
                        label={formatEnumLabel(report.project.priority)}
                      />
                    }
                  />
                ) : null}
                {report.project ? (
                  <MetadataItem
                    label="Installation date"
                    value={
                      report.project.installationDate
                        ? formatDate(report.project.installationDate)
                        : "Not scheduled"
                    }
                  />
                ) : null}
                {report.project ? (
                  <MetadataItem
                    label="Go-live date"
                    value={
                      report.project.goLiveDate
                        ? formatDate(report.project.goLiveDate)
                        : "Not scheduled"
                    }
                  />
                ) : null}
                {report.project ? (
                  <MetadataItem
                    label="Handoff status"
                    value={formatEnumLabel(report.project.handoffStatus)}
                  />
                ) : null}
                {report.project ? (
                  <MetadataItem
                    label="Monitoring ready"
                    value={formatBoolean(report.project.monitoringReady)}
                  />
                ) : null}
                {report.site ? (
                  <MetadataItem label="Site address" value={report.site.address} />
                ) : null}
                {report.site ? (
                  <MetadataItem
                    label="Timezone"
                    value={report.site.timezone ?? "Not specified"}
                  />
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MetadataItem
                  label="Client contact"
                  value={report.project?.clientContactName ?? "Not specified"}
                />
                <MetadataItem
                  label="Client email"
                  value={report.project?.clientContactEmail ?? "Not specified"}
                />
                <MetadataItem
                  label="Client phone"
                  value={report.project?.clientContactPhone ?? "Not specified"}
                />
                <MetadataItem
                  label="Internal project manager"
                  value={report.project?.internalProjectManager ?? "Not assigned"}
                />
                <MetadataItem
                  label="Lead technician"
                  value={report.project?.leadTechnician ?? "Not assigned"}
                />
                <MetadataItem
                  label="Sales owner"
                  value={report.project?.salesOwner ?? "Not assigned"}
                />
                <MetadataItem
                  label="Remote access method"
                  value={report.project?.remoteAccessMethod ?? "Not documented"}
                />
                <MetadataItem
                  label="Scope summary"
                  value={
                    report.project?.scopeSummary ??
                    report.site?.notes ??
                    "No summary notes recorded"
                  }
                />
              </div>
            </div>
          </Section>

          {report.linkedSites.length > 0 ? (
            <Section
              title="Linked Sites"
              description="All sites attached to this installation and their current operational posture."
            >
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <HeadCell>Site</HeadCell>
                      <HeadCell>Location</HeadCell>
                      <HeadCell>Status</HeadCell>
                      <HeadCell>Role / Phase</HeadCell>
                      <HeadCell>Devices</HeadCell>
                      <HeadCell>Active alerts</HeadCell>
                      <HeadCell>Health</HeadCell>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.linkedSites.map((site) => (
                      <tr key={site.id}>
                        <BodyCell>{site.name}</BodyCell>
                        <BodyCell>{site.location}</BodyCell>
                        <BodyCell>{formatEnumLabel(site.status)}</BodyCell>
                        <BodyCell>{site.roleOrPhase ?? "Primary scope"}</BodyCell>
                        <BodyCell>{site.deviceCount}</BodyCell>
                        <BodyCell>{site.activeAlertsCount}</BodyCell>
                        <BodyCell>
                          <StatusBadge tone={site.healthTone} label={site.healthLabel} />
                        </BodyCell>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            </Section>
          ) : null}

          {report.linkedProjects.length > 0 ? (
            <Section
              title="Linked Projects"
              description="Installation records currently tied to this site."
            >
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <HeadCell>Installation</HeadCell>
                      <HeadCell>Status</HeadCell>
                      <HeadCell>Role / Phase</HeadCell>
                      <HeadCell>Monitoring ready</HeadCell>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.linkedProjects.map((project) => (
                      <tr key={project.id}>
                        <BodyCell>{project.name}</BodyCell>
                        <BodyCell>{formatEnumLabel(project.status)}</BodyCell>
                        <BodyCell>{project.roleOrPhase ?? "Linked scope"}</BodyCell>
                        <BodyCell>{formatBoolean(project.monitoringReady)}</BodyCell>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            </Section>
          ) : null}

          <Section
            title="Infrastructure Summary"
            description="Asset counts and current operational posture across the exported scope."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Total devices" value={report.infrastructureSummary.totalDevices} helper="All registered devices in the exported scope." />
              <StatCard label="Routers" value={report.infrastructureSummary.routers} helper="WAN edge and primary gateway devices." />
              <StatCard label="Switches" value={report.infrastructureSummary.switches} helper="Core, distribution, and PoE switching." />
              <StatCard label="NVRs" value={report.infrastructureSummary.nvrs} helper="Recorders handling retention and playback." />
              <StatCard label="Cameras" value={report.infrastructureSummary.cameras} helper="Surveillance endpoints linked to the deployment." />
              <StatCard label="Access points" value={report.infrastructureSummary.accessPoints} helper="Wireless infrastructure supporting coverage." />
              <StatCard label="Other devices" value={report.infrastructureSummary.otherDevices} helper="Servers, access control, sensors, and additional assets." />
              <StatCard label="Active alerts" value={report.infrastructureSummary.activeAlerts} helper="Open or acknowledged issues at the time of export." />
              <StatCard label="Offline devices" value={report.infrastructureSummary.offlineDevices} helper="Devices currently reporting an offline posture." />
              <StatCard label="Readiness" value={`${report.readiness.score}%`} helper={report.readiness.label} />
            </div>
          </Section>

          <Section
            title="Network Segments"
            description="Documented VLANs, subnets, gateways, and purposes for this deployment."
          >
            {report.networkSegments.length > 0 ? (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <HeadCell>Site</HeadCell>
                      <HeadCell>Name</HeadCell>
                      <HeadCell>VLAN</HeadCell>
                      <HeadCell>Subnet</HeadCell>
                      <HeadCell>Gateway</HeadCell>
                      <HeadCell>Purpose</HeadCell>
                      <HeadCell>Notes</HeadCell>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.networkSegments.map((segment) => (
                      <tr key={segment.id}>
                        <BodyCell>{segment.siteName}</BodyCell>
                        <BodyCell>{segment.name}</BodyCell>
                        <BodyCell>{segment.vlanId ?? "N/A"}</BodyCell>
                        <BodyCell>{segment.subnetCidr}</BodyCell>
                        <BodyCell>{segment.gatewayIp ?? "Not set"}</BodyCell>
                        <BodyCell>{segment.purpose ?? "Not specified"}</BodyCell>
                        <BodyCell>{segment.notes ?? "—"}</BodyCell>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            ) : (
              <p className="text-sm text-slate-600">
                No network segments are currently documented in Command Center for this scope.
              </p>
            )}
          </Section>

          <Section
            title="Access References"
            description="Secure access metadata and vault references. Raw credentials are intentionally excluded."
          >
            {report.accessReferences.length > 0 ? (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <HeadCell>Name</HeadCell>
                      <HeadCell>Scope</HeadCell>
                      <HeadCell>Access type</HeadCell>
                      <HeadCell>Vault provider</HeadCell>
                      <HeadCell>Vault path</HeadCell>
                      <HeadCell>Owner</HeadCell>
                      <HeadCell>Remote method</HeadCell>
                      <HeadCell>Last validated</HeadCell>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.accessReferences.map((reference) => (
                      <tr key={reference.id}>
                        <BodyCell>{reference.name}</BodyCell>
                        <BodyCell>{reference.scopeLabel}</BodyCell>
                        <BodyCell>{formatEnumLabel(reference.accessType)}</BodyCell>
                        <BodyCell>{reference.vaultProvider ?? "Not set"}</BodyCell>
                        <BodyCell>{reference.vaultPath ?? "Not set"}</BodyCell>
                        <BodyCell>{reference.owner ?? "Not assigned"}</BodyCell>
                        <BodyCell>{reference.remoteAccessMethod ?? "Not documented"}</BodyCell>
                        <BodyCell>
                          {reference.lastValidatedAt
                            ? formatDate(reference.lastValidatedAt)
                            : "Not validated"}
                        </BodyCell>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            ) : (
              <p className="text-sm text-slate-600">
                No access references are recorded for this scope.
              </p>
            )}
          </Section>

          <Section
            title="NVR / Camera Mapping"
            description="Recorder channel assignments at export time."
          >
            {report.nvrAssignments.length > 0 ? (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <HeadCell>NVR</HeadCell>
                      <HeadCell>Camera</HeadCell>
                      <HeadCell>Channel</HeadCell>
                      <HeadCell>Recording</HeadCell>
                      <HeadCell>Site</HeadCell>
                      <HeadCell>Camera state</HeadCell>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.nvrAssignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <BodyCell>{assignment.nvrName}</BodyCell>
                        <BodyCell>{assignment.cameraName}</BodyCell>
                        <BodyCell>{assignment.channelNumber}</BodyCell>
                        <BodyCell>{assignment.recordingEnabled ? "Enabled" : "Disabled"}</BodyCell>
                        <BodyCell>{assignment.siteName}</BodyCell>
                        <BodyCell>
                          {assignment.cameraStatus
                            ? formatEnumLabel(assignment.cameraStatus)
                            : "Not available"}
                        </BodyCell>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            ) : (
              <p className="text-sm text-slate-600">
                No NVR channel assignments are currently documented.
              </p>
            )}
          </Section>

          <Section
            title="Device Topology Summary"
            description="Structured device relationships exported from the current topology model."
          >
            {report.deviceLinks.length > 0 ? (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <HeadCell>Site</HeadCell>
                      <HeadCell>Source device</HeadCell>
                      <HeadCell>Target device</HeadCell>
                      <HeadCell>Link type</HeadCell>
                      <HeadCell>Source port</HeadCell>
                      <HeadCell>Target port</HeadCell>
                      <HeadCell>PoE provided</HeadCell>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.deviceLinks.map((link) => (
                      <tr key={link.id}>
                        <BodyCell>{link.siteName}</BodyCell>
                        <BodyCell>{link.sourceDeviceName}</BodyCell>
                        <BodyCell>{link.targetDeviceName}</BodyCell>
                        <BodyCell>{formatEnumLabel(link.linkType)}</BodyCell>
                        <BodyCell>{link.sourcePort ?? "—"}</BodyCell>
                        <BodyCell>{link.targetPort ?? "—"}</BodyCell>
                        <BodyCell>{formatBoolean(link.poeProvided)}</BodyCell>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            ) : (
              <p className="text-sm text-slate-600">
                No device relationships are currently documented for this scope.
              </p>
            )}
          </Section>

          <Section
            title="PoE / Capacity Summary"
            description="Switch budgets, mapped downstream PoE load, headroom, and engineering warnings."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Switches" value={report.capacity.summary.totalSwitches} helper="Switch devices included in this capacity model." />
              <StatCard label="PoE-capable switches" value={report.capacity.summary.poeCapableSwitches} helper="Switches with budgets, measured load, or mapped PoE endpoints." />
              <StatCard label="Estimated load" value={formatWatts(report.capacity.summary.totalEstimatedLoadWatts)} helper="Measured PoE load where available, otherwise derived from mapped devices." />
              <StatCard label="Defined budget" value={formatWatts(report.capacity.summary.totalDefinedBudgetWatts)} helper="Configured PoE budget recorded in Command Center." />
            </div>

            {report.capacity.switches.length > 0 ? (
              <div className="mt-4 space-y-4">
                <TableWrap>
                  <Table>
                    <thead>
                      <tr>
                        <HeadCell>Switch</HeadCell>
                        <HeadCell>Site</HeadCell>
                        <HeadCell>Ports</HeadCell>
                        <HeadCell>PoE budget</HeadCell>
                        <HeadCell>Load</HeadCell>
                        <HeadCell>Headroom</HeadCell>
                        <HeadCell>Capacity state</HeadCell>
                        <HeadCell>Warnings</HeadCell>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {report.capacity.switches.map((switchRecord) => (
                        <tr key={switchRecord.switch.id}>
                          <BodyCell>{switchRecord.switch.name}</BodyCell>
                          <BodyCell>{switchRecord.switch.siteName}</BodyCell>
                          <BodyCell>
                            {switchRecord.usedPorts ?? 0}
                            {switchRecord.portCapacity !== null
                              ? ` / ${switchRecord.portCapacity}`
                              : ""}
                          </BodyCell>
                          <BodyCell>{formatWatts(switchRecord.switch.poeBudgetWatts)}</BodyCell>
                          <BodyCell>{formatWatts(switchRecord.effectiveLoadWatts)}</BodyCell>
                          <BodyCell>{formatWatts(switchRecord.remainingHeadroomWatts)}</BodyCell>
                          <BodyCell>
                            <StatusBadge tone={switchRecord.tone} label={formatEnumLabel(switchRecord.tone)} />
                          </BodyCell>
                          <BodyCell>
                            {switchRecord.warnings.length > 0
                              ? switchRecord.warnings.map((warning) => warning.label).join(", ")
                              : "No active capacity warnings"}
                          </BodyCell>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
                {report.capacity.issues.length > 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">
                      Capacity review items
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {report.capacity.issues.slice(0, 10).map((issue) => (
                        <li key={issue.id} className="flex items-start gap-2">
                          <ArrowRight className="mt-0.5 h-4 w-4 flex-none text-sky-700" />
                          <span>{issue.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                No switch capacity data is currently available for this scope.
              </p>
            )}
          </Section>

          <Section
            title="Monitoring / Readiness Summary"
            description="Operational handoff checklist derived from the current state of the record."
          >
            <div className="mb-4 grid gap-4 md:grid-cols-3">
              <StatCard label="Readiness score" value={`${report.readiness.score}%`} helper={report.readiness.summary} />
              <StatCard label="Completed checks" value={`${report.readiness.completedCount}/${report.readiness.applicableCount}`} helper="Applicable commissioning checks that are fully satisfied." />
              <StatCard label="Warnings / blockers" value={report.readiness.warnings.length + report.readiness.blockers.length} helper="Items requiring review before final handoff." />
            </div>
            <div className="space-y-3">
              {report.readiness.items.map((item) => (
                <ReadinessRow key={item.key} item={item} />
              ))}
            </div>
          </Section>

          <Section
            title="Alerts / Health Snapshot"
            description="Current alert posture and recent monitoring events at the time of export."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <h3 className="text-base font-medium text-slate-900">
                    Recent alerts
                  </h3>
                </div>
                {report.alerts.length > 0 ? (
                  <TableWrap>
                    <Table>
                      <thead>
                        <tr>
                          <HeadCell>Severity</HeadCell>
                          <HeadCell>Title</HeadCell>
                          <HeadCell>Site</HeadCell>
                          <HeadCell>Device</HeadCell>
                          <HeadCell>Status</HeadCell>
                          <HeadCell>Created</HeadCell>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {report.alerts.map((alert) => (
                          <tr key={alert.id}>
                            <BodyCell>{formatEnumLabel(alert.severity)}</BodyCell>
                            <BodyCell>{alert.title}</BodyCell>
                            <BodyCell>{alert.site?.name ?? "Unassigned"}</BodyCell>
                            <BodyCell>{alert.device?.name ?? "N/A"}</BodyCell>
                            <BodyCell>{formatEnumLabel(alert.status)}</BodyCell>
                            <BodyCell>{formatOptionalDateTime(alert.createdAt)}</BodyCell>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </TableWrap>
                ) : (
                  <p className="text-sm text-slate-600">
                    No alerts are currently available for this scope.
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-sky-700" />
                  <h3 className="text-base font-medium text-slate-900">
                    Recent health activity
                  </h3>
                </div>
                {report.healthTimeline.length > 0 ? (
                  <TableWrap>
                    <Table>
                      <thead>
                        <tr>
                          <HeadCell>Device</HeadCell>
                          <HeadCell>Site</HeadCell>
                          <HeadCell>Status</HeadCell>
                          <HeadCell>Message</HeadCell>
                          <HeadCell>Checked</HeadCell>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {report.healthTimeline.map((entry) => (
                          <tr key={entry.id}>
                            <BodyCell>{entry.deviceName}</BodyCell>
                            <BodyCell>{entry.siteName}</BodyCell>
                            <BodyCell>{formatEnumLabel(entry.status)}</BodyCell>
                            <BodyCell>{entry.message ?? "No message recorded"}</BodyCell>
                            <BodyCell>{formatOptionalDateTime(entry.checkedAt)}</BodyCell>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </TableWrap>
                ) : (
                  <p className="text-sm text-slate-600">
                    No health checks are currently recorded for this scope.
                  </p>
                )}
              </div>
            </div>
          </Section>

          <footer className="border-t border-slate-200 pt-6 text-xs leading-6 text-slate-500">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Generated by NetworkConnectIT Security Command Center on{" "}
                {formatDate(report.generatedAt)}.
              </p>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Client-ready handoff report</span>
              </div>
            </div>
          </footer>
        </article>
      </main>
    </div>
  );
}
