import assert from "node:assert/strict";
import test from "node:test";

import {
  createCableRouteBomCandidate,
  measureCableRoute,
  polylineLengthDesignUnits,
  totalCableRoutes,
  type CableRoute,
} from "../../lib/contractor-os/cable-route";

const route = (overrides: Partial<CableRoute> = {}): CableRoute => ({
  id: "route-1",
  cableType: "CAT6",
  points: [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 4 }],
  factors: { verticalRiseMeters: 2, serviceLoopMeters: 1, wastePercent: 10 },
  ...overrides,
});

test("cable routes measure waypoint polylines around obstacles", () => {
  assert.equal(polylineLengthDesignUnits(route().points), 7);
});

test("cable routes use calibrated plan scale plus vertical, service-loop and waste factors", () => {
  const measured = measureCableRoute(route(), 0.5);
  assert.equal(measured.horizontalMeters, 3.5);
  assert.ok(Math.abs(measured.wasteMeters - 0.65) < 1e-9);
  assert.ok(Math.abs(measured.totalMeters - 7.15) < 1e-9);
  assert.ok(Math.abs(measured.totalFeet - 23.458) < 0.01);
});

test("cable route measurement rejects missing calibrated scale", () => {
  assert.throws(() => measureCableRoute(route(), 0), /calibrated plan scale/i);
});

test("cable routes support standard/custom types and automatic totals", () => {
  const totals = totalCableRoutes([
    route({ id: "a", factors: { verticalRiseMeters: 0, serviceLoopMeters: 0, wastePercent: 0 } }),
    route({ id: "b", points: [{ x: 0, y: 0 }, { x: 2, y: 0 }], factors: { verticalRiseMeters: 0, serviceLoopMeters: 0, wastePercent: 0 } }),
    route({ id: "c", cableType: "CUSTOM", customCableType: "18/2 Shielded", points: [{ x: 0, y: 0 }, { x: 4, y: 0 }], factors: { verticalRiseMeters: 0, serviceLoopMeters: 0, wastePercent: 0 } }),
  ], 1);
  assert.equal(totals.length, 2);
  assert.deepEqual(totals.map((item) => ({ cableType: item.cableType, routeCount: item.routeCount, totalMeters: item.totalMeters })), [
    { cableType: "18/2 Shielded", routeCount: 1, totalMeters: 4 },
    { cableType: "CAT6", routeCount: 2, totalMeters: 9 },
  ]);
});

test("BOM handoff remains an explicit human-approval candidate", () => {
  const candidate = createCableRouteBomCandidate(route(), 0.5);
  assert.equal(candidate.sourceRouteId, "route-1");
  assert.equal(candidate.cableType, "CAT6");
  assert.equal(candidate.requiresHumanApproval, true);
});
