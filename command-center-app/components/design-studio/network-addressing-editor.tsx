"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateNetworkAddressing, type NetworkAddressing } from "@/lib/contractor-os/network-addressing";

type NetworkAddressingEditorProps = {
  value: NetworkAddressing;
  onChange: (next: NetworkAddressing) => void;
  conflict?: boolean;
};

function optionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function validationMessage(value: NetworkAddressing) {
  try {
    validateNetworkAddressing(value);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid network addressing";
  }
}

export function NetworkAddressingEditor({ value, onChange, conflict = false }: NetworkAddressingEditorProps) {
  const validation = validationMessage(value);
  const update = (patch: Partial<NetworkAddressing>) => onChange({ ...value, ...patch });

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold">Network addressing</h3>
        <p className="text-xs text-muted-foreground">Commissioning metadata for IP segmentation, switch assignment and PoE planning.</p>
      </div>

      {conflict ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          Duplicate IP conflict detected. Assign a unique address before commissioning.
        </div>
      ) : null}
      {validation ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">{validation}</div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="network-ip">IP address</Label>
          <Input id="network-ip" value={value.ipAddress ?? ""} onChange={(event) => update({ ipAddress: event.target.value || undefined })} placeholder="10.40.20.31" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="network-vlan">VLAN</Label>
          <Input id="network-vlan" type="number" min="1" max="4094" value={value.vlan ?? ""} onChange={(event) => update({ vlan: optionalNumber(event.target.value) })} placeholder="40" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="network-segment">Segment</Label>
          <Input id="network-segment" value={value.segment ?? ""} onChange={(event) => update({ segment: event.target.value || undefined })} placeholder="CCTV" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="network-subnet">Subnet / CIDR</Label>
          <Input id="network-subnet" value={value.subnetCidr ?? ""} onChange={(event) => update({ subnetCidr: event.target.value || undefined })} placeholder="10.40.20.0/24" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="network-gateway">Gateway</Label>
          <Input id="network-gateway" value={value.gateway ?? ""} onChange={(event) => update({ gateway: event.target.value || undefined })} placeholder="10.40.20.1" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="network-switch-port">Switch port</Label>
          <Input id="network-switch-port" value={value.switchPort ?? ""} onChange={(event) => update({ switchPort: event.target.value || undefined })} placeholder="IDF-2/Gi1/0/18" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="network-poe">PoE watts</Label>
          <Input id="network-poe" type="number" min="0" step="0.1" value={value.poeWatts ?? ""} onChange={(event) => update({ poeWatts: optionalNumber(event.target.value) })} placeholder="18" />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">Addressing changes are persisted with Design Studio revisions and can feed commissioning documentation.</p>
    </section>
  );
}
