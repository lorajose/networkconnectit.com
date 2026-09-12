export type CameraFovSource = "OPTICAL" | "MANUAL";

export type CameraFovParameters = {
  source: CameraFovSource;
  sensorWidthMm?: number | null;
  sensorHeightMm?: number | null;
  focalLengthMm?: number | null;
  lensMinMm?: number | null;
  lensMaxMm?: number | null;
  manualHorizontalFovDegrees?: number | null;
  manualVerticalFovDegrees?: number | null;
  mountingHeightMeters: number;
  targetPlaneHeightMeters: number;
  tiltDownDegrees: number;
  maxRangeMeters?: number | null;
};

export type ResolvedCameraFov = {
  horizontalDegrees: number;
  verticalDegrees: number;
  source: CameraFovSource;
  label: string;
};

export type CameraCoverage = {
  centerDistanceMeters: number;
  nearDistanceMeters: number;
  farDistanceMeters: number;
  polygon: Array<{ x: number; y: number }>;
  fov: ResolvedCameraFov;
};

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function positive(value: number | null | undefined, field: string) {
  if (value == null || !Number.isFinite(value) || value <= 0) throw new Error(`${field} must be greater than zero`);
  return value;
}

function boundedAngle(value: number | null | undefined, field: string, max = 179.9) {
  if (value == null || !Number.isFinite(value) || value <= 0 || value >= max) throw new Error(`${field} must be between 0 and ${max} degrees`);
  return value;
}

export function opticalFovDegrees(sensorDimensionMm: number, focalLengthMm: number) {
  const sensor = positive(sensorDimensionMm, "Sensor dimension");
  const focal = positive(focalLengthMm, "Focal length");
  return 2 * Math.atan(sensor / (2 * focal)) * RAD;
}

export function varifocalFovRange(sensorDimensionMm: number, lensMinMm: number, lensMaxMm: number) {
  const min = positive(lensMinMm, "Lens minimum");
  const max = positive(lensMaxMm, "Lens maximum");
  if (min > max) throw new Error("Lens minimum cannot exceed lens maximum");
  return {
    widestDegrees: opticalFovDegrees(sensorDimensionMm, min),
    narrowestDegrees: opticalFovDegrees(sensorDimensionMm, max),
  };
}

export function resolveCameraFov(parameters: CameraFovParameters): ResolvedCameraFov {
  if (parameters.source === "MANUAL") {
    return {
      horizontalDegrees: boundedAngle(parameters.manualHorizontalFovDegrees, "Manual horizontal FOV"),
      verticalDegrees: boundedAngle(parameters.manualVerticalFovDegrees, "Manual vertical FOV"),
      source: "MANUAL",
      label: "Manual FOV fallback",
    };
  }

  const sensorWidth = positive(parameters.sensorWidthMm, "Sensor width");
  const sensorHeight = positive(parameters.sensorHeightMm, "Sensor height");
  const focal = positive(parameters.focalLengthMm, "Focal length");
  if (parameters.lensMinMm != null && focal < parameters.lensMinMm) throw new Error("Focal length is below the varifocal lens minimum");
  if (parameters.lensMaxMm != null && focal > parameters.lensMaxMm) throw new Error("Focal length is above the varifocal lens maximum");

  return {
    horizontalDegrees: opticalFovDegrees(sensorWidth, focal),
    verticalDegrees: opticalFovDegrees(sensorHeight, focal),
    source: "OPTICAL",
    label: parameters.lensMinMm != null || parameters.lensMaxMm != null ? "Optical varifocal FOV" : "Optical fixed-lens FOV",
  };
}

function groundIntersectionDistance(heightDifferenceMeters: number, downwardAngleDegrees: number) {
  if (downwardAngleDegrees <= 0) return Number.POSITIVE_INFINITY;
  if (downwardAngleDegrees >= 89.999) return 0;
  return heightDifferenceMeters / Math.tan(downwardAngleDegrees * DEG);
}

function polar(origin: { x: number; y: number }, distance: number, angleDegrees: number) {
  const radians = angleDegrees * DEG;
  return { x: origin.x + Math.cos(radians) * distance, y: origin.y + Math.sin(radians) * distance };
}

export function calculateCameraCoverage(
  origin: { x: number; y: number },
  rotationDegrees: number,
  parameters: CameraFovParameters,
  designUnitsPerMeter = 1,
): CameraCoverage {
  if (!Number.isFinite(rotationDegrees)) throw new Error("Camera rotation must be finite");
  const unitsPerMeter = positive(designUnitsPerMeter, "Design units per meter");
  const mountingHeight = positive(parameters.mountingHeightMeters, "Mounting height");
  if (!Number.isFinite(parameters.targetPlaneHeightMeters) || parameters.targetPlaneHeightMeters < 0) throw new Error("Target plane height must be zero or greater");
  const heightDifference = mountingHeight - parameters.targetPlaneHeightMeters;
  if (heightDifference <= 0) throw new Error("Mounting height must be above the target plane");
  if (!Number.isFinite(parameters.tiltDownDegrees) || parameters.tiltDownDegrees <= 0 || parameters.tiltDownDegrees >= 90) throw new Error("Tilt must be between 0 and 90 degrees downward");

  const fov = resolveCameraFov(parameters);
  const halfVertical = fov.verticalDegrees / 2;
  const centerDistanceMeters = groundIntersectionDistance(heightDifference, parameters.tiltDownDegrees);
  const nearDistanceMeters = groundIntersectionDistance(heightDifference, parameters.tiltDownDegrees + halfVertical);
  const computedFar = groundIntersectionDistance(heightDifference, parameters.tiltDownDegrees - halfVertical);
  const configuredMax = parameters.maxRangeMeters == null ? null : positive(parameters.maxRangeMeters, "Maximum range");
  const farDistanceMeters = Number.isFinite(computedFar)
    ? configuredMax == null ? computedFar : Math.min(computedFar, configuredMax)
    : configuredMax ?? Math.max(centerDistanceMeters * 2, 30);

  const halfHorizontal = fov.horizontalDegrees / 2;
  const farDesignDistance = farDistanceMeters * unitsPerMeter;
  const nearDesignDistance = Math.max(0, nearDistanceMeters * unitsPerMeter);
  const leftFar = polar(origin, farDesignDistance, rotationDegrees - halfHorizontal);
  const rightFar = polar(origin, farDesignDistance, rotationDegrees + halfHorizontal);
  const leftNear = polar(origin, nearDesignDistance, rotationDegrees - halfHorizontal);
  const rightNear = polar(origin, nearDesignDistance, rotationDegrees + halfHorizontal);

  return {
    centerDistanceMeters,
    nearDistanceMeters,
    farDistanceMeters,
    polygon: [origin, leftFar, rightFar, origin, leftNear, rightNear],
    fov,
  };
}
