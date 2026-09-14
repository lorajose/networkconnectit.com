import assert from "node:assert/strict";
import test from "node:test";

import { summarizeAllPoeCapacity, summarizePoeCapacity, unassignedPoeDevices, validatePoeSwitchCapacity } from "../../lib/contractor-os/poe-capacity";
import type { AddressedDevice } from "../../lib/contractor-os/network-addressing";

const devices: AddressedDevice[] = [
  { id: "cam-1", label: "Camera 1", addressing: { switchPort: "IDF-1/1", poeWatts: 15 } },
  { id: "cam-2", label: "Camera 2", addressing: { switchPort: "IDF-1/2", poeWatts: 25 } },
  { id: "ap-1", label: "AP 1", addressing: { switchPort: "IDF-2/10", poeWatts: 30 } },
  { id: "reader-1", label: "Reader", addressing: { poeWatts: 8 } },
];

test("calculates usable PoE budget with reserve and assigned load", () => {
  const summary = summarizePoeCapacity({ switchId: "IDF-1", label: "IDF 1 Switch", budgetWatts: 100, reservePercent: 20 }, devices);
  assert.equal(summary.usableWatts, 80);
  assert.equal(summary.assignedWatts, 40);
  assert.equal(summary.remainingWatts, 40);
  assert.equal(summary.deviceCount, 2);
  assert.equal(summary.status, "OK");
});

test("warns near usable capacity and flags over-capacity designs", () => {
  const warning = summarizePoeCapacity({ switchId: "IDF-2", label: "IDF 2", budgetWatts: 40, reservePercent: 10 }, devices);
  assert.equal(warning.status, "WARNING");
  const over = summarizePoeCapacity({ switchId: "IDF-1", label: "IDF 1", budgetWatts: 45, reservePercent: 20 }, devices);
  assert.equal(over.status, "OVER_CAPACITY");
  assert.ok(over.remainingWatts < 0);
});

test("defaults reserve to 20 percent and validates switch capacity", () => {
  assert.equal(validatePoeSwitchCapacity({ switchId: " SW1 ", label: "", budgetWatts: 370 }).reservePercent, 20);
  assert.throws(() => validatePoeSwitchCapacity({ switchId: "", label: "Switch", budgetWatts: 100 }), /Switch ID/);
  assert.throws(() => validatePoeSwitchCapacity({ switchId: "SW1", label: "Switch", budgetWatts: 0 }), /budget/);
  assert.throws(() => validatePoeSwitchCapacity({ switchId: "SW1", label: "Switch", budgetWatts: 100, reservePercent: 100 }), /reserve/);
});

test("summarizes switches deterministically and identifies powered devices without a switch port", () => {
  const summaries = summarizeAllPoeCapacity([
    { switchId: "IDF-2", label: "B Switch", budgetWatts: 100 },
    { switchId: "IDF-1", label: "A Switch", budgetWatts: 100 },
  ], devices);
  assert.deepEqual(summaries.map((item) => item.switchId), ["IDF-1", "IDF-2"]);
  assert.deepEqual(unassignedPoeDevices(devices).map((device) => device.id), ["reader-1"]);
});
