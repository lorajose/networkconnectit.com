"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  detectIpConflicts,
  filterNetworkSegment,
  toCommissioningAddressRows,
  type AddressedDevice,
} from "@/lib/contractor-os/network-addressing";

type NetworkSegmentPanelProps = {
  devices: AddressedDevice[];
};

function csvEscape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function downloadCommissioningCsv(devices: AddressedDevice[]) {
  const rows = toCommissioningAddressRows(devices);
  const headers = ["Device ID", "Device", "IP Address", "VLAN", "Subnet/CIDR", "Gateway", "Switch Port", "Segment", "PoE Watts"];
  const body = rows.map((row) => [row.deviceId, row.deviceLabel, row.ipAddress, row.vlan, row.subnetCidr, row.gateway, row.switchPort, row.segment, row.poeWatts].map(csvEscape).join(","));
  const csv = [headers.join(","), ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "network-commissioning-addresses.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function NetworkSegmentPanel({ devices }: NetworkSegmentPanelProps) {
  const segments = useMemo(() => Array.from(new Set(devices.map((device) => device.addressing.segment?.trim()).filter((value): value is string => Boolean(value)))).sort(), [devices]);
  const [segment, setSegment] = useState("ALL");
  const visible = useMemo(() => segment === "ALL" ? devices : filterNetworkSegment(devices, segment), [devices, segment]);
  const conflicts = useMemo(() => detectIpConflicts(devices), [devices]);
  const conflicted = useMemo(() => new Set(conflicts.flatMap((conflict) => conflict.deviceIds)), [conflicts]);

  if (!devices.length) return null;

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Network segments</h3>
          <p className="text-xs text-muted-foreground">Review addressing, duplicate IP conflicts, VLANs, switch ports and PoE before commissioning.</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => downloadCommissioningCsv(visible)} disabled={!visible.length}>Export commissioning CSV</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={segment === "ALL" ? "secondary" : "outline"} onClick={() => setSegment("ALL")}>All ({devices.length})</Button>
        {segments.map((name) => {
          const count = filterNetworkSegment(devices, name).length;
          return <Button key={name} type="button" size="sm" variant={segment === name ? "secondary" : "outline"} onClick={() => setSegment(name)}>{name} ({count})</Button>;
        })}
      </div>

      {conflicts.length ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {conflicts.length} duplicate IP conflict{conflicts.length === 1 ? "" : "s"} detected. Resolve before commissioning.
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2 pr-4">Device</th><th className="py-2 pr-4">IP</th><th className="py-2 pr-4">VLAN</th><th className="py-2 pr-4">Segment</th><th className="py-2 pr-4">Switch port</th><th className="py-2">PoE</th></tr></thead>
          <tbody>
            {visible.map((device) => (
              <tr key={device.id} className={conflicted.has(device.id) ? "border-b bg-red-500/5" : "border-b"}>
                <td className="py-2 pr-4 font-medium">{device.label}</td>
                <td className="py-2 pr-4">{device.addressing.ipAddress || "—"}{conflicted.has(device.id) ? " ⚠" : ""}</td>
                <td className="py-2 pr-4">{device.addressing.vlan ?? "—"}</td>
                <td className="py-2 pr-4">{device.addressing.segment || "—"}</td>
                <td className="py-2 pr-4">{device.addressing.switchPort || "—"}</td>
                <td className="py-2">{device.addressing.poeWatts != null ? `${device.addressing.poeWatts} W` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
