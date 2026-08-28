import { describe, expect, it } from "vitest";

import {
  assertFiniteDesignGeometry,
  calculateRealWorldLength,
  measuredPolylineLength,
} from "@/lib/contractor-os/design-studio";

describe("Design Studio domain contract", () => {
  it("calculates deterministic polyline lengths independent of rendering", () => {
    expect(measuredPolylineLength([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 6, y: 8 }])).toBe(10);
  });

  it("converts calibrated design length to installation length with slack", () => {
    expect(calculateRealWorldLength({ designLength: 100, realUnitsPerDesignUnit: 0.5, slackPercent: 10 })).toBeCloseTo(55);
  });

  it("rejects invalid geometry instead of persisting non-finite coordinates", () => {
    expect(() => assertFiniteDesignGeometry({ schemaVersion: 1, points: [{ x: Number.NaN, y: 0 }] })).toThrow(/finite/);
  });
});
