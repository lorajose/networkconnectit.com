"use client";

import type { TopologyConnection } from "@/lib/contractor-os/design-canvas-state";

type DeviceOption = { id: string; label: string };

export function TopologyConnectionEditor({ value, devices, onChange }: { value?: TopologyConnection; devices: DeviceOption[]; onChange: (next?: TopologyConnection) => void }) {
  const source = value?.sourceDeviceId ?? "";
  const target = value?.targetDeviceId ?? "";
  const setSide = (side: "sourceDeviceId" | "targetDeviceId", id: string) => {
    const next = { sourceDeviceId: source, targetDeviceId: target, [side]: id } as TopologyConnection;
    if (!next.sourceDeviceId && !next.targetDeviceId) return onChange(undefined);
    onChange(next);
  };

  return <section className="rounded-xl border p-3 text-sm">
    <div className="mb-2 font-medium">Topology connection</div>
    <p className="mb-3 text-xs text-muted-foreground">Map this cable route to the devices it physically or logically connects. Connectivity is stored separately from route geometry.</p>
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="space-y-1 text-xs"><span>Source device</span><select className="w-full rounded border bg-background px-2 py-1.5" value={source} onChange={(event) => setSide("sourceDeviceId", event.target.value)}><option value="">Unassigned</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.label}</option>)}</select></label>
      <label className="space-y-1 text-xs"><span>Target device</span><select className="w-full rounded border bg-background px-2 py-1.5" value={target} onChange={(event) => setSide("targetDeviceId", event.target.value)}><option value="">Unassigned</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.label}</option>)}</select></label>
    </div>
    {source && target && source === target ? <p className="mt-2 text-xs text-red-400">Source and target must be different devices.</p> : null}
    {value ? <button type="button" className="mt-3 rounded border px-2 py-1 text-xs" onClick={() => onChange(undefined)}>Clear connection</button> : null}
  </section>;
}
