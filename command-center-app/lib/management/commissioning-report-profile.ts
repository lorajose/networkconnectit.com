export type CommissioningReportProfileInput = {
  project: { internalProjectManager: string | null; leadTechnician: string | null; salesOwner: string | null; remoteAccessMethod: string | null } | null;
  networkSegments: Array<{ subnetCidr: string; gatewayIp: string | null; notes: string | null; [key: string]: unknown }>;
  accessReferences: Array<{ vaultPath: string | null; remoteAccessMethod: string | null; notes: string | null; [key: string]: unknown }>;
  deviceLinks: Array<{ sourcePort: string | null; targetPort: string | null; notes: string | null; [key: string]: unknown }>;
  [key: string]: unknown;
};

export type CommissioningReportProfile =
  | "INTERNAL_OPERATIONS"
  | "CONTRACTOR_CLOSEOUT"
  | "CUSTOMER_COPY";

type ProfiledCommissioningReport<T extends CommissioningReportProfileInput> = T & {
  reportProfile: CommissioningReportProfile;
};

export function getCommissioningReportProfile(
  role: string
): CommissioningReportProfile {
  return role === "VIEWER" || role === "CLIENT_ADMIN"
    ? "CUSTOMER_COPY"
    : "INTERNAL_OPERATIONS";
}

export function applyCommissioningReportProfile(
  report: CommissioningReportSnapshot,
  profile: CommissioningReportProfile
): ProfiledCommissioningReport<T> {
  if (profile === "INTERNAL_OPERATIONS") {
    return { ...report, reportProfile: profile };
  }

  const customerSafe = profile === "CUSTOMER_COPY";

  return {
    ...report,
    reportProfile: profile,
    project: report.project
      ? {
          ...report.project,
          internalProjectManager: customerSafe ? null : report.project.internalProjectManager,
          leadTechnician: customerSafe ? null : report.project.leadTechnician,
          salesOwner: customerSafe ? null : report.project.salesOwner,
          remoteAccessMethod: null
        }
      : null,
    networkSegments: report.networkSegments.map((segment) => ({
      ...segment,
      subnetCidr: customerSafe ? "Redacted" : segment.subnetCidr,
      gatewayIp: null,
      notes: customerSafe ? null : segment.notes
    })),
    accessReferences: customerSafe
      ? []
      : report.accessReferences.map((reference) => ({
          ...reference,
          vaultPath: null,
          remoteAccessMethod: null,
          notes: null
        })),
    deviceLinks: report.deviceLinks.map((link) => ({
      ...link,
      sourcePort: customerSafe ? null : link.sourcePort,
      targetPort: customerSafe ? null : link.targetPort,
      notes: null
    }))
  };
}
