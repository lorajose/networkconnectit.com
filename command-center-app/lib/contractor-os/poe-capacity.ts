import type { AddressedDevice } from "./network-addressing";

export type PoeSwitchCapacity = {
  switchId: string;
  label: string;
  budgetWatts: number;
  reservePercent?: number;
};

export type PoeCapacityStatus = "OK" | "WARNING" | "OVER_CAPACITY";

export type PoeSwitchSummary = {
  switchId: string;
  label: string;
  budgetWatts: number;
  reserveWatts: number;
  usableWatts: number;
  assignedWatts: number;
  remainingWatts: number;
  utilizationPercent: number;
  deviceCount: number;
  status: PoeCapacityStatus;
};

function switchIdFromPort(switchPort?: string): string | undefined {
  const value = switchPort?.trim();
  if (!value) return undefined;
  const slash = value.indexOf("/");
  return (slash === -1 ? value : value.slice(0, slash)).trim() || undefined;
}

export function validatePoeSwitchCapacity(value: PoeSwitchCapacity): PoeSwitchCapacity {
  if (!value.switchId.trim()) throw new Error("Switch ID is required");
  if (!Number.isFinite(value.budgetWatts) || value.budgetWatts <= 0) throw new Error("PoE budget must be positive");
  const reservePercent = value.reservePercent ?? 20;
  if (!Number.isFinite(reservePercent) || reservePercent < 0 || reservePercent >= 100) {
    throw new Error("PoE reserve percent must be between 0 and 99.99");
  }
  return { ...value, switchId: value.switchId.trim(), label: value.label.trim() || value.switchId.trim(), reservePercent };
}

export function summarizePoeCapacity(capacity: PoeSwitchCapacity, devices: AddressedDevice[]): PoeSwitchSummary {
  const normalized = validatePoeSwitchCapacity(capacity);
  const assigned = devices.filter((device) => switchIdFromPort(device.addressing.switchPort)?.toLowerCase() === normalized.switchId.toLowerCase());
  const assignedWatts = assigned.reduce((sum, device) => sum + (device.addressing.poeWatts ?? 0), 0);
  const reserveWatts = normalized.budgetWatts * ((normalized.reservePercent ?? 20) / 100);
  const usableWatts = normalized.budgetWatts - reserveWatts;
  const remainingWatts = usableWatts - assignedWatts;
  const utilizationPercent = usableWatts > 0 ? (assignedWatts / usableWatts) * 100 : 100;
  const status: PoeCapacityStatus = remainingWatts < 0 ? "OVER_CAPACITY" : utilizationPercent >= 80 ? "WARNING" : "OK";
  return {
    switchId: normalized.switchId,
    label: normalized.label,
    budgetWatts: normalized.budgetWatts,
    reserveWatts,
    usableWatts,
    assignedWatts,
    remainingWatts,
    utilizationPercent,
    deviceCount: assigned.length,
    status,
  };
}

export function summarizeAllPoeCapacity(capacities: PoeSwitchCapacity[], devices: AddressedDevice[]): PoeSwitchSummary[] {
  return capacities.map((capacity) => summarizePoeCapacity(capacity, devices)).sort((a, b) => a.label.localeCompare(b.label));
}

export function unassignedPoeDevices(devices: AddressedDevice[]): AddressedDevice[] {
  return devices.filter((device) => (device.addressing.poeWatts ?? 0) > 0 && !switchIdFromPort(device.addressing.switchPort));
}
