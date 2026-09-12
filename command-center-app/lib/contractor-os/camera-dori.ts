export type PixelDensityUnit = "PPM" | "PPF";

export type DoriZoneKey = "DETECT" | "OBSERVE" | "RECOGNIZE" | "IDENTIFY" | string;

export type DoriThreshold = {
  key: DoriZoneKey;
  label: string;
  minimumPpm: number;
  standardReference?: string | null;
};

export type CameraPixelDensityInput = {
  horizontalPixels: number;
  horizontalFovDegrees: number;
};

export type DoriZoneDistance = DoriThreshold & {
  distanceMeters: number;
  distanceFeet: number;
};

const FEET_PER_METER = 3.280839895013123;

function positive(value: number, field: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${field} must be greater than zero`);
  return value;
}

function validFov(value: number) {
  if (!Number.isFinite(value) || value <= 0 || value >= 179.9) throw new Error("Horizontal FOV must be between 0 and 179.9 degrees");
  return value;
}

export const DEFAULT_DORI_THRESHOLDS: DoriThreshold[] = [
  { key: "DETECT", label: "Detect", minimumPpm: 25, standardReference: "Configurable DORI reference" },
  { key: "OBSERVE", label: "Observe", minimumPpm: 62.5, standardReference: "Configurable DORI reference" },
  { key: "RECOGNIZE", label: "Recognize", minimumPpm: 125, standardReference: "Configurable DORI reference" },
  { key: "IDENTIFY", label: "Identify", minimumPpm: 250, standardReference: "Configurable DORI reference" },
];

export function sceneWidthMetersAtDistance(distanceMeters: number, horizontalFovDegrees: number) {
  const distance = positive(distanceMeters, "Distance");
  const fov = validFov(horizontalFovDegrees);
  return 2 * distance * Math.tan((fov * Math.PI) / 360);
}

export function pixelsPerMeterAtDistance(input: CameraPixelDensityInput, distanceMeters: number) {
  const pixels = positive(input.horizontalPixels, "Horizontal pixels");
  return pixels / sceneWidthMetersAtDistance(distanceMeters, input.horizontalFovDegrees);
}

export function pixelsPerFootAtDistance(input: CameraPixelDensityInput, distanceMeters: number) {
  return pixelsPerMeterAtDistance(input, distanceMeters) / FEET_PER_METER;
}

export function pixelDensityAtDistance(input: CameraPixelDensityInput, distanceMeters: number, unit: PixelDensityUnit) {
  return unit === "PPM"
    ? pixelsPerMeterAtDistance(input, distanceMeters)
    : pixelsPerFootAtDistance(input, distanceMeters);
}

export function distanceForPixelsPerMeter(input: CameraPixelDensityInput, targetPpm: number) {
  const pixels = positive(input.horizontalPixels, "Horizontal pixels");
  const ppm = positive(targetPpm, "Target PPM");
  const fov = validFov(input.horizontalFovDegrees);
  return pixels / (2 * ppm * Math.tan((fov * Math.PI) / 360));
}

export function calculateDoriZones(input: CameraPixelDensityInput, thresholds: DoriThreshold[] = DEFAULT_DORI_THRESHOLDS) {
  if (!Array.isArray(thresholds) || thresholds.length === 0) throw new Error("At least one DORI threshold is required");
  return thresholds
    .map((threshold) => {
      const minimumPpm = positive(threshold.minimumPpm, `${threshold.label || threshold.key} threshold`);
      const distanceMeters = distanceForPixelsPerMeter(input, minimumPpm);
      return {
        ...threshold,
        minimumPpm,
        distanceMeters,
        distanceFeet: distanceMeters * FEET_PER_METER,
      } satisfies DoriZoneDistance;
    })
    .sort((a, b) => a.minimumPpm - b.minimumPpm);
}

export function describePixelDensity(input: CameraPixelDensityInput, distanceMeters: number) {
  const ppm = pixelsPerMeterAtDistance(input, distanceMeters);
  return {
    distanceMeters,
    distanceFeet: distanceMeters * FEET_PER_METER,
    ppm,
    ppf: ppm / FEET_PER_METER,
  };
}
