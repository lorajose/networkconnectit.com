export type RiskFindingType =
  | "QUANTITY_CONFLICT"
  | "UNPRICED_TAKEOFF"
  | "MISSING_RESPONSIBILITY"
  | "ASSUMPTION"
  | "EXCLUSION"
  | "ALTERNATE"
  | "RISK_NOTE";

export type RiskSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type QuantityEvidence = {
  source: "TAKEOFF" | "ESTIMATE" | "BID" | "PROJECT";
  sourceId: string;
  key: string;
  description: string;
  quantity: number;
  unit?: string | null;
  sheetReference?: string | null;
};

export type ScopeStatement = {
  source: "BID" | "PROJECT" | "TAKEOFF" | "ESTIMATE";
  sourceId: string;
  kind: "SCOPE" | "RESPONSIBILITY" | "ASSUMPTION" | "EXCLUSION" | "ALTERNATE" | "RISK";
  text: string;
  responsibility?: string | null;
};

export type ScopeRiskInput = {
  quantities: QuantityEvidence[];
  statements: ScopeStatement[];
  quantityTolerance?: number;
};

export type ScopeRiskFinding = {
  type: RiskFindingType;
  severity: RiskSeverity;
  title: string;
  detail: string;
  stableKey: string;
  sourceRefs: Array<{ source: string; sourceId: string }>;
  proposalSection: "SCOPE" | "EXCLUSIONS" | "ALTERNATES" | "ASSUMPTIONS" | "RISKS" | null;
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizedQuantityKey(row: QuantityEvidence) {
  return normalizeKey(row.key || row.description);
}

function quantityLabel(value: number, unit?: string | null) {
  return `${value}${unit ? ` ${unit}` : ""}`;
}

export function analyzeScopeRisk(input: ScopeRiskInput): ScopeRiskFinding[] {
  const tolerance = input.quantityTolerance ?? 0.001;
  const findings: ScopeRiskFinding[] = [];
  const byKey = new Map<string, QuantityEvidence[]>();

  for (const row of input.quantities) {
    const key = normalizedQuantityKey(row);
    if (!key) continue;
    const rows = byKey.get(key) ?? [];
    rows.push(row);
    byKey.set(key, rows);
  }

  for (const [key, rows] of byKey.entries()) {
    const takeoff = rows.find((row) => row.source === "TAKEOFF");
    const estimate = rows.find((row) => row.source === "ESTIMATE");

    if (takeoff && estimate && Math.abs(takeoff.quantity - estimate.quantity) > tolerance) {
      findings.push({
        type: "QUANTITY_CONFLICT",
        severity: "HIGH",
        title: `Quantity conflict: ${takeoff.description}`,
        detail: `Takeoff shows ${quantityLabel(takeoff.quantity, takeoff.unit)} while Estimate shows ${quantityLabel(estimate.quantity, estimate.unit)}. Human review is required; no quantity or price is changed automatically.`,
        stableKey: `quantity-conflict:${key}:${takeoff.sourceId}:${estimate.sourceId}`,
        sourceRefs: [
          { source: takeoff.source, sourceId: takeoff.sourceId },
          { source: estimate.source, sourceId: estimate.sourceId },
        ],
        proposalSection: "RISKS",
      });
    }

    if (takeoff && !estimate) {
      findings.push({
        type: "UNPRICED_TAKEOFF",
        severity: "HIGH",
        title: `Takeoff item not represented in Estimate: ${takeoff.description}`,
        detail: `${quantityLabel(takeoff.quantity, takeoff.unit)} was counted${takeoff.sheetReference ? ` on ${takeoff.sheetReference}` : ""}, but no matching Estimate line was found.`,
        stableKey: `unpriced-takeoff:${key}:${takeoff.sourceId}`,
        sourceRefs: [{ source: takeoff.source, sourceId: takeoff.sourceId }],
        proposalSection: "RISKS",
      });
    }
  }

  for (const statement of input.statements) {
    const text = statement.text.trim();
    if (!text) continue;
    const sourceRefs = [{ source: statement.source, sourceId: statement.sourceId }];
    const key = normalizeKey(text).slice(0, 120);

    if (statement.kind === "RESPONSIBILITY" && !statement.responsibility?.trim()) {
      findings.push({
        type: "MISSING_RESPONSIBILITY",
        severity: "MEDIUM",
        title: "Scope responsibility is not assigned",
        detail: text,
        stableKey: `missing-responsibility:${statement.source}:${statement.sourceId}:${key}`,
        sourceRefs,
        proposalSection: "SCOPE",
      });
      continue;
    }

    const mapping: Partial<Record<ScopeStatement["kind"], { type: RiskFindingType; section: ScopeRiskFinding["proposalSection"]; severity: RiskSeverity }>> = {
      ASSUMPTION: { type: "ASSUMPTION", section: "ASSUMPTIONS", severity: "LOW" },
      EXCLUSION: { type: "EXCLUSION", section: "EXCLUSIONS", severity: "MEDIUM" },
      ALTERNATE: { type: "ALTERNATE", section: "ALTERNATES", severity: "LOW" },
      RISK: { type: "RISK_NOTE", section: "RISKS", severity: "MEDIUM" },
    };
    const mapped = mapping[statement.kind];
    if (!mapped) continue;

    findings.push({
      type: mapped.type,
      severity: mapped.severity,
      title: `${statement.kind.charAt(0)}${statement.kind.slice(1).toLowerCase()} requires review`,
      detail: text,
      stableKey: `${mapped.type.toLowerCase()}:${statement.source}:${statement.sourceId}:${key}`,
      sourceRefs,
      proposalSection: mapped.section,
    });
  }

  return findings.sort((a, b) => a.stableKey.localeCompare(b.stableKey));
}
