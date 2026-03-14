import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Network,
  ShieldAlert,
  Zap
} from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import type {
  CapacityDeviceRecord,
  CapacitySnapshot,
  CapacitySwitchRecord
} from "@/lib/management/capacity";
import { formatEnumLabel } from "@/lib/utils";

type CapacitySummaryViewProps = {
  snapshot: CapacitySnapshot;
  actions?: ReactNode;
};

function formatWatts(value: number | null) {
  if (value === null) {
    return "Not defined";
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 1
  }).format(value)} W`;
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "Not available";
  }

  return `${Math.round(value)}%`;
}

function formatHeadroom(value: number | null) {
  if (value === null) {
    return "Unknown";
  }

  const absolute = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: absolute >= 100 ? 0 : 1
  }).format(absolute);

  return value >= 0 ? `${formatted} W free` : `${formatted} W over`;
}

function formatPortSummary(record: CapacitySwitchRecord) {
  if (record.portCapacity === null && record.usedPorts === null) {
    return "Not defined";
  }

  if (record.portCapacity === null) {
    return `${record.usedPorts ?? 0} used`;
  }

  return `${record.usedPorts ?? 0} / ${record.portCapacity}`;
}

function loadSourceLabel(source: CapacitySwitchRecord["loadSource"]) {
  switch (source) {
    case "measured":
      return "Measured PoE load";
    case "derived":
      return "Derived from mapped devices";
    case "unknown":
      return "No reliable load data";
  }
}

function toneLabel(tone: CapacitySnapshot["summary"]["tone"]) {
  return tone.charAt(0).toUpperCase() + tone.slice(1);
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

function ScopeDeviceLink({ device }: { device: CapacityDeviceRecord }) {
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
          {device.estimatedPoeWatts !== null ? (
            <p>Estimated draw {formatWatts(device.estimatedPoeWatts)}</p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function SwitchCapacityCard({ record }: { record: CapacitySwitchRecord }) {
  return (
    <Card className="border-border/80 bg-card/80">
      <CardHeader className="gap-4 pb-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base text-foreground">
                <Link href={record.switch.href} className="hover:text-sky-200">
                  {record.switch.name}
                </Link>
              </CardTitle>
              <StatusBadge
                tone={record.tone}
                label={toneLabel(record.tone)}
                withIcon
              />
              {record.isPoeCapable ? (
                <Badge variant="outline">PoE in scope</Badge>
              ) : (
                <Badge variant="outline">Non-PoE summary only</Badge>
              )}
            </div>
            <CardDescription className="text-sm leading-6">
              {record.switch.siteName}
              {record.switch.siteLocation !== "Not specified"
                ? ` · ${record.switch.siteLocation}`
                : ""}
              {" · "}
              {record.switch.brand ?? "Unknown vendor"}
              {record.switch.model ? ` ${record.switch.model}` : ""}
            </CardDescription>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {record.switch.switchRole
                  ? formatEnumLabel(record.switch.switchRole)
                  : "Switch role not set"}
              </Badge>
              {record.switch.projectName ? (
                <Badge variant="outline">{record.switch.projectName}</Badge>
              ) : null}
              {record.switch.activeAlerts > 0 ? (
                <Badge variant="outline">{record.switch.activeAlerts} active alerts</Badge>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[340px]">
            <MetadataItem
              label="Ports"
              value={
                <div className="space-y-1">
                  <div>{formatPortSummary(record)}</div>
                  <p className="text-xs text-muted-foreground">
                    {record.freePorts !== null
                      ? `${record.freePorts} free · ${formatPercent(record.portPct)} utilization`
                      : "Port headroom unavailable"}
                  </p>
                </div>
              }
            />
            <MetadataItem
              label="PoE budget"
              value={
                <div className="space-y-1">
                  <div>{formatWatts(record.switch.poeBudgetWatts)}</div>
                  <p className="text-xs text-muted-foreground">
                    {record.switch.poeBudgetWatts !== null
                      ? "Configured switch budget"
                      : "Define budget for accurate capacity review"}
                  </p>
                </div>
              }
            />
            <MetadataItem
              label="PoE load"
              value={
                <div className="space-y-1">
                  <div>{formatWatts(record.effectiveLoadWatts)}</div>
                  <p className="text-xs text-muted-foreground">
                    {loadSourceLabel(record.loadSource)}
                  </p>
                </div>
              }
            />
            <MetadataItem
              label="Headroom"
              value={
                <div className="space-y-1">
                  <div>{formatHeadroom(record.remainingHeadroomWatts)}</div>
                  <p className="text-xs text-muted-foreground">
                    {record.loadPct !== null
                      ? `${formatPercent(record.loadPct)} of PoE budget`
                      : "Cannot calculate until load and budget are defined"}
                  </p>
                </div>
              }
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {record.warnings.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {record.warnings.map((warning) => (
              <StatusBadge
                key={warning.id}
                tone={warning.tone}
                label={warning.label}
              />
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-4">
          <MetadataItem
            label="Mapped PoE devices"
            value={`${record.mappedPoeDevicesCount} downstream`}
          />
          <MetadataItem
            label="Unknown watt estimates"
            value={`${record.unknownWattsDevicesCount} device${record.unknownWattsDevicesCount === 1 ? "" : "s"}`}
          />
          <MetadataItem
            label="Critical alerts"
            value={`${record.switch.criticalAlerts} issue${record.switch.criticalAlerts === 1 ? "" : "s"}`}
          />
          <MetadataItem
            label="Switch health"
            value={<StatusBadge tone={record.switch.statusTone} label={formatEnumLabel(record.switch.status)} />}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-sky-200" />
            <h3 className="text-sm font-medium text-foreground">
              Downstream PoE device summary
            </h3>
          </div>
          {record.downstreamDevices.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-border/70">
              <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] gap-4 border-b border-border/70 bg-background/40 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
                <span>Device</span>
                <span>Ports</span>
                <span>PoE</span>
                <span>Estimated load</span>
                <span>Status</span>
              </div>
              {record.downstreamDevices.map((entry) => (
                <div
                  key={entry.linkId}
                  className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] gap-4 border-b border-border/70 px-4 py-3 text-sm last:border-b-0"
                >
                  <div className="min-w-0 space-y-1">
                    <Link
                      href={entry.device.href}
                      className="font-medium text-foreground hover:text-sky-200"
                    >
                      {entry.device.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatEnumLabel(entry.device.type)}
                      {entry.device.brand ? ` · ${entry.device.brand}` : ""}
                      {entry.device.model ? ` ${entry.device.model}` : ""}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>{entry.sourcePort ?? "Source N/A"}</p>
                    <p>{entry.targetPort ?? "Target N/A"}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {entry.poeProvided === true
                      ? "Confirmed"
                      : entry.poeProvided === false
                        ? "No"
                        : "Inferred"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatWatts(entry.estimatedWatts)}
                  </div>
                  <div>
                    <StatusBadge
                      tone={entry.device.statusTone}
                      label={formatEnumLabel(entry.device.status)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No downstream PoE relationships are mapped for this switch.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CapacitySummaryView({
  snapshot,
  actions
}: CapacitySummaryViewProps) {
  const hasCapacityData =
    snapshot.switches.length > 0 ||
    snapshot.unmappedPoeDevices.length > 0 ||
    snapshot.issues.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={snapshot.scope === "site" ? "Site Capacity" : "Project Capacity"}
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
                PoE / Capacity Engineering Review
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge
                  tone={snapshot.summary.tone}
                  label={snapshot.summary.label}
                  withIcon
                />
                <Badge variant="outline">
                  {snapshot.summary.totalSwitches} switches in scope
                </Badge>
                <Badge variant="outline">
                  {snapshot.issues.length} issue{snapshot.issues.length === 1 ? "" : "s"} to review
                </Badge>
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {snapshot.name}
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                  Capacity-focused summary for switch port usage, mapped PoE demand, and infrastructure upgrade risk across the current deployment scope.
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
                label="Site scope"
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
                    "Multi-site project scope"
                  )
                }
              />
              <MetadataItem
                label="Installation"
                value={
                  snapshot.project ? (
                    <Link
                      href={snapshot.project.href}
                      className="font-medium text-foreground hover:text-sky-200"
                    >
                      {snapshot.project.name}
                    </Link>
                  ) : (
                    "Site-level engineering view"
                  )
                }
              />
              <MetadataItem
                label="PoE budget"
                value={
                  <div className="space-y-1">
                    <div>{formatWatts(snapshot.summary.totalDefinedBudgetWatts)}</div>
                    <p className="text-xs text-muted-foreground">
                      {snapshot.summary.switchesMissingBudget} switch
                      {snapshot.summary.switchesMissingBudget === 1 ? "" : "es"} missing budget data
                    </p>
                  </div>
                }
              />
              <MetadataItem
                label="Estimated load"
                value={
                  <div className="space-y-1">
                    <div>{formatWatts(snapshot.summary.totalEstimatedLoadWatts)}</div>
                    <p className="text-xs text-muted-foreground">
                      {snapshot.summary.mappedPoeDevices} mapped PoE device
                      {snapshot.summary.mappedPoeDevices === 1 ? "" : "s"}
                    </p>
                  </div>
                }
              />
              <MetadataItem
                label="Ports"
                value={
                  <div className="space-y-1">
                    <div>
                      {snapshot.summary.usedPorts} used
                      {snapshot.summary.totalPorts > 0
                        ? ` / ${snapshot.summary.totalPorts}`
                        : ""}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {snapshot.summary.totalPorts > 0
                        ? `${snapshot.summary.freePorts} free ports recorded`
                        : "Free port headroom unavailable"}
                    </p>
                  </div>
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <Card className="border-border/70 bg-background/30">
              <CardHeader className="pb-3">
                <CardDescription>Capacity posture</CardDescription>
                <CardTitle className="text-2xl">
                  {snapshot.summary.switchesOverCapacity > 0
                    ? "Upgrade attention required"
                    : snapshot.summary.switchesNearCapacity > 0
                      ? "PoE headroom running low"
                      : "Current load within review targets"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-sky-200" />
                  <span>{snapshot.summary.switchesRequiringReview} switch records flagged for review</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-200" />
                  <span>{snapshot.summary.devicesMissingPoeSourceMapping} devices missing PoE source mapping</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-sky-200" />
                  <span>{snapshot.summary.devicesMissingEstimatedWatts} devices missing watt estimates</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-background/30">
              <CardHeader className="pb-3">
                <CardDescription>Engineering guidance</CardDescription>
                <CardTitle className="text-lg">Next review priorities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Confirm switch budgets before handoff, map every camera and AP to an upstream PoE source, and capture estimated wattage for unmapped or partially documented devices.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Warning at 80%</Badge>
                  <Badge variant="outline">Critical above 100%</Badge>
                  <Badge variant="outline">Port headroom included where available</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total switches"
          value={snapshot.summary.totalSwitches}
          helper="All switching devices within the current site or project scope."
        />
        <StatCard
          label="PoE-capable switches"
          value={snapshot.summary.poeCapableSwitches}
          helper="Switches with PoE budgets, measured load, or mapped PoE endpoints."
        />
        <StatCard
          label="Estimated PoE load"
          value={formatWatts(snapshot.summary.totalEstimatedLoadWatts)}
          helper="Measured PoE usage where available, otherwise derived from mapped downstream devices."
        />
        <StatCard
          label="Defined PoE budget"
          value={formatWatts(snapshot.summary.totalDefinedBudgetWatts)}
          helper="Configured switch budgets used to calculate headroom and upgrade thresholds."
        />
        <StatCard
          label="Near-capacity switches"
          value={snapshot.summary.switchesNearCapacity}
          helper="Switches at or above the 80% warning threshold."
        />
        <StatCard
          label="Over-capacity switches"
          value={snapshot.summary.switchesOverCapacity}
          helper="Switches above 100% PoE or port capacity usage."
        />
        <StatCard
          label="Missing PoE source mapping"
          value={snapshot.summary.devicesMissingPoeSourceMapping}
          helper="PoE-relevant edge devices with no mapped upstream switch."
        />
        <StatCard
          label="Ports in use"
          value={
            snapshot.summary.totalPorts > 0
              ? `${snapshot.summary.usedPorts}/${snapshot.summary.totalPorts}`
              : snapshot.summary.usedPorts
          }
          helper="Derived or configured switch port usage across the current scope."
        />
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Switch capacity summary
            </h2>
            <p className="text-sm text-muted-foreground">
              Per-switch PoE budget, mapped downstream load, port utilization, and alert-driven review signals.
            </p>
          </div>
        </div>

        {snapshot.switches.length > 0 ? (
          <div className="space-y-4">
            {snapshot.switches.map((record) => (
              <SwitchCapacityCard key={record.switch.id} record={record} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No switches registered"
            description="Add switching infrastructure to evaluate PoE supply, port headroom, and downstream power coverage."
          />
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/80 bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-200" />
              <CardTitle className="text-base">Capacity warnings</CardTitle>
            </div>
            <CardDescription>
              Structural issues, missing data, and upgrade signals derived from PoE coverage and switch headroom.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.issues.length > 0 ? (
              <div className="space-y-3">
                {snapshot.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{issue.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {issue.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={issue.tone} label={toneLabel(issue.tone)} />
                        {issue.href ? (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={issue.href}>
                              Review
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No capacity blockers or documentation gaps are currently flagged.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/80 bg-card/80">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-sky-200" />
                <CardTitle className="text-base">Devices missing PoE source mapping</CardTitle>
              </div>
              <CardDescription>
                Cameras, APs, or other edge devices that appear PoE-powered but are not linked to an upstream switch.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {snapshot.unmappedPoeDevices.length > 0 ? (
                <div className="grid gap-3">
                  {snapshot.unmappedPoeDevices.map((device) => (
                    <ScopeDeviceLink key={device.id} device={device} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  All PoE-relevant devices in scope have a mapped upstream source.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/80">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-sky-200" />
                <CardTitle className="text-base">Devices missing watt estimates</CardTitle>
              </div>
              <CardDescription>
                These devices are mapped or flagged as PoE-powered but still need estimated draw recorded for accurate modeling.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {snapshot.devicesMissingEstimatedWatts.length > 0 ? (
                <div className="grid gap-3">
                  {snapshot.devicesMissingEstimatedWatts.map((device) => (
                    <ScopeDeviceLink key={device.id} device={device} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Estimated wattage is defined for all PoE-relevant devices in scope.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {!hasCapacityData ? (
        <EmptyState
          title="No capacity data available"
          description="This scope does not yet have enough switching or PoE relationship data to generate an engineering capacity summary."
        />
      ) : null}
    </div>
  );
}
