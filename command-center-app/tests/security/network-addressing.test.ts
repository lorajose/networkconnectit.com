import assert from "node:assert/strict";
import test from "node:test";

import {
  detectIpConflicts,
  filterNetworkSegment,
  isValidIpv4,
  toCommissioningAddressRows,
  validateNetworkAddressing,
  type AddressedDevice,
} from "../../lib/contractor-os/network-addressing";

const devices: AddressedDevice[] = [
  {
    id: "cam-1",
    label: "Lobby Camera",
    addressing: { ipAddress: "10.20.30.10", vlan: 30, subnetCidr: "10.20.30.0/24", gateway: "10.20.30.1", switchPort: "SW1/1", segment: "CCTV", poeWatts: 12.5 },
  },
  {
    id: "cam-2",
    label: "Dock Camera",
    addressing: { ipAddress: "10.20.30.10", vlan: 30, subnetCidr: "10.20.30.0/24", gateway: "10.20.30.1", switchPort: "SW1/2", segment: "CCTV", poeWatts: 18 },
  },
  {
    id: "reader-1",
    label: "Main Reader",
    addressing: { ipAddress: "10.20.40.15", vlan: 40, segment: "Access Control", switchPort: "SW2/7", poeWatts: 7 },
  },
];

test("validates IPv4, VLAN and PoE metadata", () => {
  assert.equal(isValidIpv4("192.168.1.10"), true);
  assert.equal(isValidIpv4("999.1.1.1"), false);
  assert.equal(validateNetworkAddressing(devices[0].addressing).vlan, 30);
  assert.throws(() => validateNetworkAddressing({ vlan: 4095 }), /VLAN/);
  assert.throws(() => validateNetworkAddressing({ poeWatts: -1 }), /PoE/);
});

test("detects duplicate IP addresses", () => {
  assert.deepEqual(detectIpConflicts(devices), [{ ipAddress: "10.20.30.10", deviceIds: ["cam-1", "cam-2"] }]);
});

test("filters devices by network segment case-insensitively", () => {
  assert.deepEqual(filterNetworkSegment(devices, "cctv").map((device) => device.id), ["cam-1", "cam-2"]);
});

test("exports addressing and PoE metadata for commissioning documentation", () => {
  const rows = toCommissioningAddressRows(devices);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.find((row) => row.deviceId === "cam-1"), {
    deviceId: "cam-1",
    deviceLabel: "Lobby Camera",
    ipAddress: "10.20.30.10",
    vlan: "30",
    subnetCidr: "10.20.30.0/24",
    gateway: "10.20.30.1",
    switchPort: "SW1/1",
    segment: "CCTV",
    poeWatts: "12.5",
  });
});
