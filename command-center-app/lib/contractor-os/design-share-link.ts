import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

import type { IssuedDesignReport } from "./design-report-issuance";
import { resolveDesignReportProfile, type DesignReportProfile } from "./design-report-profile";

export type DesignShareAuditEvent = "VIEW" | "DOWNLOAD" | "DENIED";

export type PublicDesignShare = {
  shareId: string;
  reportVersion: number;
  issuedAt: string;
  profile: DesignReportProfile;
  model: IssuedDesignReport["model"];
  digest: string;
};

export type DesignShareRecord = {
  id: string;
  organizationId: string;
  projectId: string;
  reportDigest: string;
  tokenHash: string;
  passwordHash: string | null;
  profile: DesignReportProfile;
  publicSnapshotJson: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export type DesignShareRepository = {
  create(record: DesignShareRecord): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<DesignShareRecord | null>;
  revoke(shareId: string, organizationId: string, revokedAt: Date): Promise<boolean>;
  audit(input: {
    shareId: string | null;
    event: DesignShareAuditEvent;
    at: Date;
    detail?: string;
  }): Promise<void>;
};

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function publicProfile(profile?: Partial<DesignReportProfile>) {
  const resolved = resolveDesignReportProfile({ ...profile, clientSafe: true });
  return {
    ...resolved,
    clientSafe: true,
    includePricing: false,
    sections: resolved.sections.filter((section) => section !== "PRICING_SUMMARY"),
  };
}

function publicReport(report: IssuedDesignReport, profile: DesignReportProfile): PublicDesignShare {
  if (!report.profile.clientSafe) {
    throw new Error("Only client-safe issued design reports can be shared");
  }

  return {
    shareId: "",
    reportVersion: report.version,
    issuedAt: report.issuedAt,
    profile,
    model: {
      ...report.model,
      sections: profile.sections,
      pricingVisible: false,
      floors: report.model.floors.map((floor) => ({
        id: "",
        name: floor.name,
        elementCount: floor.elementCount,
        deviceCount: floor.deviceCount,
        cablePathCount: floor.cablePathCount,
      })),
      bom: report.model.bom.map((item) => ({
        ...item,
        sourceElementIds: [],
      })),
      cableSchedule: report.model.cableSchedule.map((row) => ({
        ...row,
        sourceElementIds: [],
      })),
      warnings: report.model.warnings,
    },
    digest: report.digest,
  };
}

function parsePublicSnapshot(record: DesignShareRecord): PublicDesignShare {
  let parsed: unknown;
  try {
    parsed = JSON.parse(record.publicSnapshotJson);
  } catch {
    throw new Error("Shared design snapshot is invalid");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Shared design snapshot is invalid");
  }

  const view = parsed as PublicDesignShare;
  if (view.digest !== record.reportDigest || view.profile?.clientSafe !== true || view.profile?.includePricing !== false) {
    throw new Error("Shared design snapshot integrity check failed");
  }
  if (view.model?.pricingVisible !== false) {
    throw new Error("Shared design snapshot exposes pricing");
  }

  return { ...view, shareId: record.id };
}

export async function createDesignShare(input: {
  repository: DesignShareRepository;
  report: IssuedDesignReport;
  profile?: Partial<DesignReportProfile>;
  password?: string;
  expiresAt?: Date | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const profile = publicProfile(input.profile);

  if (!input.report.profile.clientSafe) {
    throw new Error("Share links require a client-safe issued design report");
  }
  if (input.expiresAt && input.expiresAt.getTime() <= now.getTime()) {
    throw new Error("Share expiration must be in the future");
  }

  const rawToken = randomBytes(32).toString("base64url");
  const shareId = `share_${randomBytes(12).toString("hex")}`;
  const passwordHash = input.password?.trim()
    ? await bcrypt.hash(input.password, 12)
    : null;
  const snapshot = publicReport(input.report, profile);

  await input.repository.create({
    id: shareId,
    organizationId: input.report.organizationId,
    projectId: input.report.projectId,
    reportDigest: input.report.digest,
    tokenHash: tokenHash(rawToken),
    passwordHash,
    profile,
    publicSnapshotJson: JSON.stringify(snapshot),
    expiresAt: input.expiresAt ?? null,
    revokedAt: null,
    createdAt: now,
  });

  return {
    shareId,
    token: rawToken,
    expiresAt: input.expiresAt ?? null,
    profile,
  };
}

export async function resolveDesignShare(input: {
  repository: DesignShareRepository;
  token: string;
  password?: string;
  event?: "VIEW" | "DOWNLOAD";
  now?: Date;
}): Promise<PublicDesignShare> {
  const now = input.now ?? new Date();
  const hash = tokenHash(input.token);
  const record = await input.repository.findByTokenHash(hash);

  if (!record) {
    await input.repository.audit({ shareId: null, event: "DENIED", at: now, detail: "unknown_token" });
    throw new Error("Share link is invalid");
  }
  if (record.revokedAt) {
    await input.repository.audit({ shareId: record.id, event: "DENIED", at: now, detail: "revoked" });
    throw new Error("Share link is revoked");
  }
  if (record.expiresAt && record.expiresAt.getTime() <= now.getTime()) {
    await input.repository.audit({ shareId: record.id, event: "DENIED", at: now, detail: "expired" });
    throw new Error("Share link is expired");
  }
  if (record.passwordHash) {
    const valid = Boolean(input.password) && await bcrypt.compare(input.password ?? "", record.passwordHash);
    if (!valid) {
      await input.repository.audit({ shareId: record.id, event: "DENIED", at: now, detail: "password" });
      throw new Error("Share password is invalid");
    }
  }

  let view: PublicDesignShare;
  try {
    view = parsePublicSnapshot(record);
  } catch {
    await input.repository.audit({ shareId: record.id, event: "DENIED", at: now, detail: "snapshot_integrity" });
    throw new Error("Share link is invalid");
  }

  await input.repository.audit({
    shareId: record.id,
    event: input.event ?? "VIEW",
    at: now,
  });

  return view;
}

export async function revokeDesignShare(input: {
  repository: DesignShareRepository;
  shareId: string;
  organizationId: string;
  now?: Date;
}) {
  return input.repository.revoke(
    input.shareId,
    input.organizationId,
    input.now ?? new Date()
  );
}
