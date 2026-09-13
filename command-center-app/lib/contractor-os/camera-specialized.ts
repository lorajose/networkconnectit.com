export type CameraSignalType = "IP" | "ANALOG";
export type CameraProjectionType = "RECTILINEAR" | "FISHEYE_180" | "PANORAMIC_360" | "PTZ";

export type CameraEstimateNotice = {
  estimated: true;
  label: string;
};

export type IrIlluminationSettings = {
  enabled: boolean;
  rangeMeters: number;
  beamAngleDegrees?: number | null;
};

export type PtzPreset = {
  id: string;
  label: string;
  panDegrees: number;
  tiltDegrees?: number | null;
  zoom?: number | null;
  home?: boolean;
};

export type PtzSimulationSettings = {
  panStartDegrees: number;
  panEndDegrees: number;
  presets: PtzPreset[];
};

export type SpecializedCameraSettings = {
  signalType: CameraSignalType;
  projection: CameraProjectionType;
  ir?: IrIlluminationSettings | null;
  ptz?: PtzSimulationSettings | null;
};

export type PolarCoverage = {
  kind: "SECTOR" | "CIRCLE";
  radiusMeters: number;
  startDegrees: number;
  endDegrees: number;
  estimated: true;
  estimateLabel: string;
};

export const DESIGN_ESTIMATE_NOTICE: CameraEstimateNotice = {
  estimated: true,
  label: "Design estimate — verify manufacturer specifications and field conditions before installation",
};

function positive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be positive and finite`);
  return value;
}

export function normalizeDegrees(value: number) {
  if (!Number.isFinite(value)) throw new Error("Angle must be finite");
  return ((value % 360) + 360) % 360;
}

export function clockwiseSweepDegrees(startDegrees: number, endDegrees: number) {
  const start = normalizeDegrees(startDegrees);
  const end = normalizeDegrees(endDegrees);
  const sweep = (end - start + 360) % 360;
  return sweep === 0 ? 360 : sweep;
}

export function calculateIrCoverage(settings: IrIlluminationSettings, cameraHeadingDegrees: number): PolarCoverage | null {
  if (!settings.enabled) return null;
  const radiusMeters = positive(settings.rangeMeters, "IR range");
  const heading = normalizeDegrees(cameraHeadingDegrees);
  const beam = settings.beamAngleDegrees == null ? 360 : positive(settings.beamAngleDegrees, "IR beam angle");
  if (beam > 360) throw new Error("IR beam angle cannot exceed 360 degrees");
  if (beam === 360) {
    return { kind: "CIRCLE", radiusMeters, startDegrees: 0, endDegrees: 360, estimated: true, estimateLabel: DESIGN_ESTIMATE_NOTICE.label };
  }
  return {
    kind: "SECTOR",
    radiusMeters,
    startDegrees: normalizeDegrees(heading - beam / 2),
    endDegrees: normalizeDegrees(heading + beam / 2),
    estimated: true,
    estimateLabel: DESIGN_ESTIMATE_NOTICE.label,
  };
}

export function calculatePtzCoverage(settings: PtzSimulationSettings, rangeMeters: number): PolarCoverage {
  const radiusMeters = positive(rangeMeters, "PTZ range");
  const sweep = clockwiseSweepDegrees(settings.panStartDegrees, settings.panEndDegrees);
  return {
    kind: sweep >= 359.999 ? "CIRCLE" : "SECTOR",
    radiusMeters,
    startDegrees: normalizeDegrees(settings.panStartDegrees),
    endDegrees: normalizeDegrees(settings.panEndDegrees),
    estimated: true,
    estimateLabel: DESIGN_ESTIMATE_NOTICE.label,
  };
}

export function calculateProjectionCoverage(projection: CameraProjectionType, headingDegrees: number, rangeMeters: number, horizontalFovDegrees?: number | null): PolarCoverage {
  const radiusMeters = positive(rangeMeters, "Camera range");
  const heading = normalizeDegrees(headingDegrees);
  if (projection === "PANORAMIC_360") {
    return { kind: "CIRCLE", radiusMeters, startDegrees: 0, endDegrees: 360, estimated: true, estimateLabel: DESIGN_ESTIMATE_NOTICE.label };
  }
  if (projection === "FISHEYE_180") {
    return { kind: "SECTOR", radiusMeters, startDegrees: normalizeDegrees(heading - 90), endDegrees: normalizeDegrees(heading + 90), estimated: true, estimateLabel: DESIGN_ESTIMATE_NOTICE.label };
  }
  if (projection === "PTZ") throw new Error("PTZ projection requires PTZ pan settings");
  if (horizontalFovDegrees == null || !Number.isFinite(horizontalFovDegrees) || horizontalFovDegrees <= 0 || horizontalFovDegrees >= 180) {
    throw new Error("Rectilinear projection requires horizontal FOV between 0 and 180 degrees");
  }
  return {
    kind: "SECTOR",
    radiusMeters,
    startDegrees: normalizeDegrees(heading - horizontalFovDegrees / 2),
    endDegrees: normalizeDegrees(heading + horizontalFovDegrees / 2),
    estimated: true,
    estimateLabel: DESIGN_ESTIMATE_NOTICE.label,
  };
}

export function validateSpecializedCameraSettings(settings: SpecializedCameraSettings) {
  if (settings.signalType !== "IP" && settings.signalType !== "ANALOG") throw new Error("Unsupported camera signal type");
  if (settings.ir?.enabled) calculateIrCoverage(settings.ir, 0);
  if (settings.projection === "PTZ") {
    if (!settings.ptz) throw new Error("PTZ cameras require PTZ settings");
    calculatePtzCoverage(settings.ptz, 1);
    for (const preset of settings.ptz.presets) {
      if (!preset.id.trim() || !preset.label.trim()) throw new Error("PTZ presets require id and label");
      normalizeDegrees(preset.panDegrees);
      if (preset.tiltDegrees != null && (!Number.isFinite(preset.tiltDegrees) || preset.tiltDegrees < -90 || preset.tiltDegrees > 90)) throw new Error("PTZ tilt must be between -90 and 90 degrees");
      if (preset.zoom != null && (!Number.isFinite(preset.zoom) || preset.zoom <= 0)) throw new Error("PTZ zoom must be positive");
    }
  }
  return settings;
}
