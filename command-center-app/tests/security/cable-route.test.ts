import { describe, expect, it } from "vitest";
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

describe("cable route planner", () => {
  it("measures waypoint polylines around obstacles", () => {
    expect(polylineLengthDesignUnits(route().points)).toBe(7);
  });

  it("uses calibrated plan scale plus vertical, service-loop and waste factors", () => {
    const measured = measureCableRoute(route(), 0.5);
    expect(measured.horizontalMeters).toBe(3.5);
    expect(measured.wasteMeters).toBeCloseTo(0.65);
    expect(measured.totalMeters).toBeCloseTo(7.15);
    expect(measured.totalFeet).toBeCloseTo(23.458, 2);
  });

  it("rejects measurement without a valid calibrated scale", () => {
    expect(() => measureCableRoute(route(), 0)).toThrow(/calibrated plan scale/i);
  });

  it("supports standard and custom cable types and totals automatically", () => {
    const totals = totalCableRoutes([
      route({ id: "a", factors: { verticalRiseMeters: 0, serviceLoopMeters: 0, wastePercent: 0 } }),
      route({ id: "b", points: [{ x: 0, y: 0 }, { x: 2, y: 0 }], factors: { verticalRiseMeters: 0, serviceLoopMeters: 0, wastePercent: 0 } }),
      route({ id: "c", cableType: "CUSTOM", customCableType: "18/2 Shielded", points: [{ x: 0, y: 0 }, { x: 4, y: 0 }], factors: { verticalRiseMeters: 0, serviceLoopMeters: 0, wastePercent: 0 } }),
    ], 1);
    expect(totals).toEqual([
      expect.objectContaining({ cableType: "18/2 Shielded", routeCount: 1, totalMeters: 4 }),
      expect.objectContaining({ cableType: "CAT6", routeCount: 2, totalMeters: 9 }),
    ]);
  });

  it("creates only a human-approved BOM candidate, never an automatic BOM mutation", () => {
    expect(createCableRouteBomCandidate(route(), 0.5)).toEqual(expect.objectContaining({
      sourceRouteId: "route-1",
      cableType: "CAT6",
      requiresHumanApproval: true,
    }));
  });
});
