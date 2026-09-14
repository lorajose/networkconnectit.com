export type NetworkAddressing = {
  ipAddress?: string;
  vlan?: number;
  subnetCidr?: string;
  gateway?: string;
  switchPort?: string;
  poeWatts?: number;
  segment?: string;
};

export type AddressedDevice = {
  id: string;
  label: string;
  addressing: NetworkAddressing;
};

export type AddressConflict = {
  ipAddress: string;
  deviceIds: string[];
};

function octets(ip: string): number[] | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  const values = parts.map(Number);
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return null;
  return values;
}

export function isValidIpv4(ip: string): boolean {
  return octets(ip) !== null;
}

export function isValidIpv4Cidr(value: string): boolean {
  const [address, prefix, ...extra] = value.trim().split("/");
  if (extra.length || !address || prefix == null || !isValidIpv4(address)) return false;
  const numericPrefix = Number(prefix);
  return Number.isInteger(numericPrefix) && numericPrefix >= 0 && numericPrefix <= 32;
}

export function validateNetworkAddressing(addressing: NetworkAddressing): NetworkAddressing {
  if (addressing.ipAddress && !isValidIpv4(addressing.ipAddress)) throw new Error("Invalid IPv4 address");
  if (addressing.gateway && !isValidIpv4(addressing.gateway)) throw new Error("Invalid gateway IPv4 address");
  if (addressing.subnetCidr && !isValidIpv4Cidr(addressing.subnetCidr)) throw new Error("Invalid IPv4 subnet/CIDR");
  if (addressing.vlan != null && (!Number.isInteger(addressing.vlan) || addressing.vlan < 1 || addressing.vlan > 4094)) {
    throw new Error("VLAN must be between 1 and 4094");
  }
  if (addressing.poeWatts != null && (!Number.isFinite(addressing.poeWatts) || addressing.poeWatts < 0)) {
    throw new Error("PoE watts must be non-negative");
  }
  return {
    ...addressing,
    ipAddress: addressing.ipAddress?.trim() || undefined,
    subnetCidr: addressing.subnetCidr?.trim() || undefined,
    gateway: addressing.gateway?.trim() || undefined,
    switchPort: addressing.switchPort?.trim() || undefined,
    segment: addressing.segment?.trim() || undefined,
  };
}

export function detectIpConflicts(devices: AddressedDevice[]): AddressConflict[] {
  const owners = new Map<string, string[]>();
  for (const device of devices) {
    const ip = device.addressing.ipAddress?.trim();
    if (!ip) continue;
    const ids = owners.get(ip) ?? [];
    ids.push(device.id);
    owners.set(ip, ids);
  }
  return [...owners.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([ipAddress, deviceIds]) => ({ ipAddress, deviceIds: [...deviceIds].sort() }))
    .sort((a, b) => a.ipAddress.localeCompare(b.ipAddress));
}

export function filterNetworkSegment(devices: AddressedDevice[], segment: string): AddressedDevice[] {
  const target = segment.trim().toLowerCase();
  return devices.filter((device) => (device.addressing.segment ?? "").trim().toLowerCase() === target);
}

export type CommissioningAddressRow = {
  deviceId: string;
  deviceLabel: string;
  ipAddress: string;
  vlan: string;
  subnetCidr: string;
  gateway: string;
  switchPort: string;
  segment: string;
  poeWatts: string;
};

export function toCommissioningAddressRows(devices: AddressedDevice[]): CommissioningAddressRow[] {
  return [...devices]
    .sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id))
    .map((device) => ({
      deviceId: device.id,
      deviceLabel: device.label,
      ipAddress: device.addressing.ipAddress?.trim() ?? "",
      vlan: device.addressing.vlan?.toString() ?? "",
      subnetCidr: device.addressing.subnetCidr?.trim() ?? "",
      gateway: device.addressing.gateway?.trim() ?? "",
      switchPort: device.addressing.switchPort?.trim() ?? "",
      segment: device.addressing.segment?.trim() ?? "",
      poeWatts: device.addressing.poeWatts?.toString() ?? "",
    }));
}
