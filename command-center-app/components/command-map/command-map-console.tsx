"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { divIcon } from "leaflet";
import {
  Activity,
  ArrowRight,
  Camera,
  Network,
  Radio,
  Router,
  Server
} from "lucide-react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer
} from "react-leaflet";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CommandMapSnapshot } from "@/lib/command-map/types";
import { formatOptionalDateTime } from "@/lib/utils";

type CommandMapConsoleProps = {
  snapshot: CommandMapSnapshot;
};

const markerColors = {
  healthy: "#34d399",
  warning: "#f59e0b",
  critical: "#fb7185",
  unknown: "#94a3b8",
  info: "#38bdf8"
} as const;

function createMarkerIcon(
  status: keyof typeof markerColors,
  issueCount: number,
  selected: boolean
) {
  const color = markerColors[status];
  const shadow = selected
    ? `0 0 0 4px ${color}33, 0 16px 28px rgba(15,23,42,0.45)`
    : `0 0 0 2px ${color}26, 0 10px 22px rgba(15,23,42,0.35)`;
  const size = selected ? 38 : 32;
  const badgeSize = issueCount > 0 ? 18 : 0;

  return divIcon({
    className: "",
    html: `
      <div style="position:relative; width:${size}px; height:${size}px;">
        <div style="display:flex; align-items:center; justify-content:center; width:${size}px; height:${size}px; border-radius:9999px; background:${color}; border:2px solid rgba(15,23,42,0.82); box-shadow:${shadow};">
          <div style="width:${selected ? 12 : 10}px; height:${selected ? 12 : 10}px; border-radius:9999px; background:rgba(255,255,255,0.88);"></div>
        </div>
        ${
          issueCount > 0
            ? `<div style="position:absolute; top:-4px; right:-4px; min-width:${badgeSize}px; height:${badgeSize}px; border-radius:9999px; background:rgba(15,23,42,0.92); border:1px solid rgba(255,255,255,0.14); color:white; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; padding:0 4px;">${issueCount}</div>`
            : ""
        }
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}

function getInitialSelectedSiteId(sites: CommandMapSnapshot["map"]["sites"]) {
  return (
    sites.find((site) => site.health === "critical")?.id ??
    sites.find((site) => site.coordinates)?.id ??
    sites[0]?.id ??
    ""
  );
}

function PanelListCard({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-border/80 bg-card/80">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-sm leading-6">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export function CommandMapConsole({ snapshot }: CommandMapConsoleProps) {
  const [selectedSiteId, setSelectedSiteId] = useState(
    getInitialSelectedSiteId(snapshot.map.sites)
  );

  const selectedSite = useMemo(
    () =>
      snapshot.map.sites.find((site) => site.id === selectedSiteId) ??
      snapshot.map.sites[0] ??
      null,
    [selectedSiteId, snapshot.map.sites]
  );
  const hasSitesInScope = snapshot.map.sites.length > 0;
  const mapEmptyMessage = hasSitesInScope
    ? "No sites with coordinates match the current filters. Adjust the scope or add site coordinates to place them on the command map."
    : "No sites are currently in scope for this tenant/filter combination. Add sites or widen the current filters to populate the command map.";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_380px]">
      <Card className="border-border/80 bg-card/80">
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="text-xl">Global NOC map</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                Internal operations view of all mapped customer sites, live issue volume, and linked project context.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {snapshot.map.mappedSiteCount} mapped site
                {snapshot.map.mappedSiteCount === 1 ? "" : "s"}
              </Badge>
              <Badge variant="outline">
                {snapshot.map.sites.length} total in scope
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          {snapshot.map.mappedSiteCount > 0 ? (
            <div className="h-[560px] w-full overflow-hidden rounded-[1.75rem] border border-border/70">
              <MapContainer
                center={snapshot.map.center}
                zoom={snapshot.map.zoom}
                scrollWheelZoom={false}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {snapshot.map.sites
                  .filter((site) => site.coordinates)
                  .map((site) => (
                    <Marker
                      key={site.id}
                      position={site.coordinates!}
                      icon={createMarkerIcon(
                        site.health,
                        Math.max(site.activeAlerts, site.offlineDevices),
                        site.id === selectedSite?.id
                      )}
                      eventHandlers={{
                        click: () => setSelectedSiteId(site.id)
                      }}
                    >
                      <Popup>
                        <div className="min-w-[260px] space-y-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              {site.organizationName}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {site.siteName}
                            </p>
                            <p className="text-xs text-slate-600">
                              {site.city}, {site.country}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <StatusBadge
                              tone={site.health}
                              label={site.health}
                              className="text-[11px]"
                            />
                            <span className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white">
                              {site.activeAlerts} active alerts
                            </span>
                            <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-800">
                              {site.offlineDevices} offline
                            </span>
                          </div>
                          <div className="space-y-1 text-xs text-slate-600">
                            <p>{site.deviceCount} devices in scope</p>
                            <p>
                              Project:{" "}
                              {site.primaryProject?.name ?? "No linked project"}
                            </p>
                            <p>
                              Latest monitoring:{" "}
                              {formatOptionalDateTime(site.latestHealthAt)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs font-medium text-sky-700">
                            <Link href={site.siteHref}>
                              Site details
                            </Link>
                            {site.primaryProject ? (
                              <Link href={site.primaryProject.href}>
                                Project details
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
              </MapContainer>
            </div>
          ) : (
            <div className="flex h-[560px] items-center justify-center rounded-[1.75rem] border border-dashed border-border/70 bg-background/30 px-6 text-center text-sm text-muted-foreground">
              {mapEmptyMessage}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {Object.entries(markerColors).map(([tone, color]) => (
              <div
                key={tone}
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/35 px-3 py-1.5 text-xs text-muted-foreground"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {tone.charAt(0).toUpperCase() + tone.slice(1)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <PanelListCard
          title="Selected site"
          description="Operational context, issue posture, and linked project quick access for the focused location."
        >
          {selectedSite ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={selectedSite.health} label={selectedSite.health} />
                  <Badge variant="outline">{selectedSite.organizationName}</Badge>
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {selectedSite.siteName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSite.city}, {selectedSite.country}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-background/35 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
                    Active alerts
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {selectedSite.activeAlerts}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/35 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
                    Offline devices
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {selectedSite.offlineDevices}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/35 px-3 py-2.5">
                  <span>Projects</span>
                  <span className="font-medium text-foreground">
                    {selectedSite.projectLinks.length || "None"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/35 px-3 py-2.5">
                  <span>Devices in scope</span>
                  <span className="font-medium text-foreground">
                    {selectedSite.deviceCount}
                  </span>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/35 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
                    Latest monitoring activity
                  </p>
                  <p className="mt-2 font-medium text-foreground">
                    {selectedSite.latestHealthDeviceName
                      ? `${selectedSite.latestHealthDeviceName} · ${formatOptionalDateTime(
                          selectedSite.latestHealthAt
                        )}`
                      : "No recent health activity"}
                  </p>
                  {selectedSite.latestHealthMessage ? (
                    <p className="mt-1 text-xs leading-5">
                      {selectedSite.latestHealthMessage}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/35 p-3">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground/70">
                    <Router className="h-3.5 w-3.5" />
                    Routers
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {selectedSite.deviceTypeCounts.routers}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/35 p-3">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground/70">
                    <Network className="h-3.5 w-3.5" />
                    Switches
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {selectedSite.deviceTypeCounts.switches}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/35 p-3">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground/70">
                    <Server className="h-3.5 w-3.5" />
                    NVRs
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {selectedSite.deviceTypeCounts.nvrs}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/35 p-3">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground/70">
                    <Camera className="h-3.5 w-3.5" />
                    Cameras
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {selectedSite.deviceTypeCounts.cameras}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/35 p-3">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground/70">
                    <Radio className="h-3.5 w-3.5" />
                    Access points
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {selectedSite.deviceTypeCounts.accessPoints}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/35 p-3">
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground/70">
                    <Activity className="h-3.5 w-3.5" />
                    Other
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {selectedSite.deviceTypeCounts.other}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={selectedSite.siteHref}
                  className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/35 px-3 py-2 text-sm font-medium text-foreground transition hover:border-sky-400/30 hover:text-sky-200"
                >
                  Site detail
                  <ArrowRight className="h-4 w-4" />
                </Link>
                {selectedSite.primaryProject ? (
                  <Link
                    href={selectedSite.primaryProject.href}
                    className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/35 px-3 py-2 text-sm font-medium text-foreground transition hover:border-sky-400/30 hover:text-sky-200"
                  >
                    Project detail
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No site is currently selected.
            </p>
          )}
        </PanelListCard>

        <PanelListCard
          title="Operations panel"
          description="Critical sites, recent alerts, top issue-bearing projects, and monitoring activity in the current command scope."
        >
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                Active filters
              </p>
              {snapshot.activeFilters.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {snapshot.activeFilters.map((filter) => (
                    <Badge key={filter.id} variant="outline">
                      {filter.label}: {filter.value}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Global internal NOC view with no additional filters applied.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                Critical sites
              </p>
              {snapshot.panel.criticalSites.length > 0 ? (
                snapshot.panel.criticalSites.map((site) => (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => setSelectedSiteId(site.id)}
                    className="flex w-full items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background/35 px-3 py-3 text-left transition hover:border-rose-400/25"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {site.siteName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {site.organizationName}
                        {site.projectName ? ` · ${site.projectName}` : ""}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <StatusBadge tone={site.health} label={site.health} className="justify-center" />
                      <p className="text-xs text-rose-200">
                        {site.activeAlerts} alerts · {site.offlineDevices} offline
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No critical sites in the current scope.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                Recent alerts
              </p>
              {snapshot.panel.recentAlerts.length > 0 ? (
                snapshot.panel.recentAlerts.map((alert) => (
                  <Link
                    key={alert.id}
                    href={alert.href}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background/35 px-3 py-3 transition hover:border-amber-400/25"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {alert.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {alert.siteName} · {alert.organizationName}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <StatusBadge tone={alert.severity === "critical" ? "critical" : alert.severity === "high" ? "warning" : "info"} label={alert.severity} />
                      <p className="text-xs text-muted-foreground">
                        {formatOptionalDateTime(alert.createdAt)}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent alerts match the current filters.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                Top projects with issues
              </p>
              {snapshot.panel.topProjects.length > 0 ? (
                snapshot.panel.topProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={project.href}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background/35 px-3 py-3 transition hover:border-sky-400/25"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {project.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {project.organizationName} · {project.siteCount} impacted sites
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <StatusBadge tone={project.health} label={project.health} />
                      <p className="text-xs text-muted-foreground">
                        {project.activeAlerts} alerts · {project.offlineDevices} offline
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No linked projects currently show active issues.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                Sites with offline devices
              </p>
              {snapshot.panel.offlineSites.length > 0 ? (
                snapshot.panel.offlineSites.map((site) => (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => setSelectedSiteId(site.id)}
                    className="flex w-full items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background/35 px-3 py-3 text-left transition hover:border-amber-400/25"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {site.siteName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {site.organizationName}
                      </p>
                    </div>
                    <p className="text-xs font-medium text-amber-200">
                      {site.offlineDevices} offline / {site.deviceCount} devices
                    </p>
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No offline-device sites in the current command view.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                Recent monitoring activity
              </p>
              {snapshot.panel.recentMonitoring.length > 0 ? (
                snapshot.panel.recentMonitoring.map((activity) => (
                  <Link
                    key={activity.id}
                    href={activity.siteHref}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background/35 px-3 py-3 transition hover:border-sky-400/25"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {activity.deviceName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.siteName} · {activity.organizationName}
                      </p>
                      {activity.message ? (
                        <p className="text-xs text-muted-foreground">
                          {activity.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-right">
                      <StatusBadge tone={activity.status} label={activity.status} />
                      <p className="text-xs text-muted-foreground">
                        {formatOptionalDateTime(activity.checkedAt)}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent monitoring activity exists for the filtered sites.
                </p>
              )}
            </div>
          </div>
        </PanelListCard>
      </div>
    </div>
  );
}
