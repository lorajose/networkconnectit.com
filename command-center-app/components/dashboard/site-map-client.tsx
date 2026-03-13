"use client";

import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer
} from "react-leaflet";

import { StatusBadge } from "@/components/dashboard/status-badge";
import type { DashboardSnapshot } from "@/lib/dashboard/types";

type SiteMapClientProps = {
  map: DashboardSnapshot["map"];
};

const markerColors = {
  healthy: "#34d399",
  warning: "#f59e0b",
  critical: "#fb7185",
  unknown: "#94a3b8",
  info: "#38bdf8"
} as const;

export default function SiteMapClient({ map }: SiteMapClientProps) {
  return (
    <div
      className={map.size === "large" ? "h-[420px] w-full" : "h-[320px] w-full"}
    >
      <MapContainer
        center={map.center}
        zoom={map.zoom}
        scrollWheelZoom={false}
        className="h-full w-full rounded-[1.5rem]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {map.sites.map((site) => (
          <CircleMarker
            key={site.id}
            center={site.coordinates}
            radius={10}
            pathOptions={{
              color: markerColors[site.status],
              fillColor: markerColors[site.status],
              fillOpacity: 0.7,
              weight: 2
            }}
          >
            <Popup>
              <div className="min-w-[220px] space-y-3">
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
                    tone={site.status}
                    label={site.status}
                    className="text-[11px]"
                  />
                  <span className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white">
                    {site.deviceCount} devices
                  </span>
                </div>
                <a
                  href={site.detailsHref}
                  className="inline-flex text-xs font-medium text-sky-600 underline decoration-sky-400/60 underline-offset-4"
                >
                  Site details
                </a>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
