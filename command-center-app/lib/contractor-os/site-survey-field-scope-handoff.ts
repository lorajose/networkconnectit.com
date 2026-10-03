import type { FieldScopeDraft, FieldScopeSystem, FieldScopeValue } from "./field-scope";
import type { SurveyDiscipline } from "./site-survey";


const systemByDiscipline: Record<SurveyDiscipline, FieldScopeSystem> = {
  CCTV: "SURVEILLANCE",
  NETWORK: "NETWORK",
  ACCESS_CONTROL: "ACCESS_CONTROL",
  FIRE_ALARM: "OTHER",
  AUDIO_AV: "OTHER",
  RADIO_WIRELESS: "NETWORK",
};

function observed<T>(value: T | null, sourceText?: string | null): FieldScopeValue<T> {
  return { value, confidence: value == null ? "LOW" : "HIGH", sourceText: sourceText ?? null };
}

function parseDisciplines(json: string): SurveyDiscipline[] {
  try { return JSON.parse(json) as SurveyDiscipline[]; } catch { return []; }
}

export type FieldScopeSurveyWorkspace = {\n  session: { id: string };\n  assignment: { disciplinesJson: string; projectInstallationId: string; siteId: string };\n  areas: Array<{ id: string; name: string }>;\n  points: Array<{ id: string; areaId: string | null; discipline: string; pointType: string; lifecycle: string; label: string | null; notes: string | null }>;\n};\n\nexport type SurveyFieldScopeSeed = {
  surveyPointId: string;
  draft: FieldScopeDraft;
};

/**
 * Deterministically seeds Field Scope from authoritative NCI-013 survey data.
 * This does not invoke AI and does not invent missing field conditions.
 */
export function seedFieldScopeFromSurvey(workspace: FieldScopeSurveyWorkspace): SurveyFieldScopeSeed[] {
  const disciplines = new Set(parseDisciplines(workspace.assignment.disciplinesJson));
  const areaById = new Map(workspace.areas.map((area) => [area.id, area.name]));

  return workspace.points
    .filter((point) => point.lifecycle === "PROPOSED")
    .filter((point) => disciplines.has(point.discipline as SurveyDiscipline))
    .map((point, index) => {
      const discipline = point.discipline as SurveyDiscipline;
      const location = point.areaId ? areaById.get(point.areaId) ?? null : null;
      const stableKey = point.label?.trim() || `${point.pointType}-${String(index + 1).padStart(3, "0")}`;
      const note = point.notes?.trim() || null;

      return {
        surveyPointId: point.id,
        draft: {
          schemaVersion: "1",
          projectId: workspace.assignment.projectInstallationId,
          siteId: workspace.assignment.siteId,
          surveySessionId: workspace.session.id,
          surveyPointId: point.id,
          stableKey,
          system: systemByDiscipline[discipline],
          discipline,
          deviceType: observed(point.pointType, note),
          location: observed(location),
          environment: { value: null, confidence: "LOW", sourceText: note },
          quantity: observed(1),
          mountingHeightFt: { value: null, confidence: "LOW", sourceText: note },
          mountingSurface: { value: null, confidence: "LOW", sourceText: note },
          cableType: { value: null, confidence: "LOW", sourceText: note },
          estimatedCableLengthFt: { value: null, confidence: "LOW", sourceText: note },
          pathway: { value: null, confidence: "LOW", sourceText: note },
          destination: { value: null, confidence: "LOW", sourceText: note },
          accessEquipment: { value: null, confidence: "LOW", sourceText: note },
          requestedAccessories: [],
          suggestedAccessories: [],
          laborDrivers: [],
          assumptions: [],
          exclusions: [],
          missingInformation: [
            "environment",
            "mountingHeightFt",
            "mountingSurface",
            "cableType",
            "estimatedCableLengthFt",
            "pathway",
            "destination",
            "accessEquipment",
          ],
          sourceNote: note,
        },
      };
    });
}
