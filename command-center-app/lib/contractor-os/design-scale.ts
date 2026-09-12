export const DESIGN_LENGTH_UNITS = ["FT", "IN", "M", "CM", "MM"] as const;

export type DesignLengthUnit = (typeof DESIGN_LENGTH_UNITS)[number];

export type DesignScaleCalibration = {
  schemaVersion: 1;
  designDistance: number;
  realDistance: number;
  unit: DesignLengthUnit;
  realUnitsPerDesignUnit: number;
};

const METERS_PER_UNIT: Record<DesignLengthUnit, number> = {
  FT: 0.3048,
  IN: 0.0254,
  M: 1,
  CM: 0.01,
  MM: 0.001,
};

export function assertDesignLengthUnit(value: string): asserts value is DesignLengthUnit {
  if (!DESIGN_LENGTH_UNITS.includes(value as DesignLengthUnit)) {
    throw new Error("Unsupported design length unit");
  }
}

export function calibrateDesignScale(input: {
  designDistance: number;
  realDistance: number;
  unit: DesignLengthUnit;
}): DesignScaleCalibration {
  const { designDistance, realDistance, unit } = input;
  assertDesignLengthUnit(unit);
  if (!Number.isFinite(designDistance) || designDistance <= 0) {
    throw new Error("Calibration design distance must be a positive finite number");
  }
  if (!Number.isFinite(realDistance) || realDistance <= 0) {
    throw new Error("Calibration real distance must be a positive finite number");
  }

  return {
    schemaVersion: 1,
    designDistance,
    realDistance,
    unit,
    realUnitsPerDesignUnit: realDistance / designDistance,
  };
}

export function measureCalibratedDesignLength(input: {
  designDistance: number;
  calibration: DesignScaleCalibration;
}) {
  if (!Number.isFinite(input.designDistance) || input.designDistance < 0) {
    throw new Error("Design distance must be a non-negative finite number");
  }
  if (!Number.isFinite(input.calibration.realUnitsPerDesignUnit) || input.calibration.realUnitsPerDesignUnit <= 0) {
    throw new Error("Calibration ratio must be a positive finite number");
  }
  return input.designDistance * input.calibration.realUnitsPerDesignUnit;
}

export function metersPerDesignUnit(realUnitsPerDesignUnit: number, unit: DesignLengthUnit) {
  assertDesignLengthUnit(unit);
  if (!Number.isFinite(realUnitsPerDesignUnit) || realUnitsPerDesignUnit <= 0) {
    throw new Error("Calibration ratio must be a positive finite number");
  }
  return realUnitsPerDesignUnit * METERS_PER_UNIT[unit];
}

export function designUnitsPerMeter(realUnitsPerDesignUnit: number, unit: DesignLengthUnit) {
  return 1 / metersPerDesignUnit(realUnitsPerDesignUnit, unit);
}

export function measureCalibratedDesignLengthMeters(input: {
  designDistance: number;
  realUnitsPerDesignUnit: number;
  unit: DesignLengthUnit;
}) {
  if (!Number.isFinite(input.designDistance) || input.designDistance < 0) {
    throw new Error("Design distance must be a non-negative finite number");
  }
  return input.designDistance * metersPerDesignUnit(input.realUnitsPerDesignUnit, input.unit);
}

export function scaleChangeAffectsCalculatedLengths(
  current: DesignScaleCalibration | null,
  next: DesignScaleCalibration,
  tolerance = 1e-9,
) {
  if (!current) return false;
  if (current.unit !== next.unit) return true;
  return Math.abs(current.realUnitsPerDesignUnit - next.realUnitsPerDesignUnit) > tolerance;
}
