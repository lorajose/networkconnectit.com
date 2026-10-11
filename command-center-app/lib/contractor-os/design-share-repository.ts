import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { DesignShareRecord, DesignShareRepository, DesignShareAuditEvent } from "./design-share-link";
import type { DesignReportProfile } from "./design-report-profile";

type ShareRow = {
  id: string; organizationId: string; projectId: string; reportDigest: string;
  tokenHash: string; passwordHash: string | null; profileJson: string;
  publicSnapshotJson: string; expiresAt: Date | null; revokedAt: Date | null; createdAt: Date;
};

function parseProfile(value: string): DesignReportProfile {
  const parsed = JSON.parse(value) as DesignReportProfile;
  if (!parsed || parsed.clientSafe !== true || parsed.includePricing !== false || !Array.isArray(parsed.sections)) {
    throw new Error("Persisted design share profile is invalid");
  }
  return parsed;
}

export const mysqlDesignShareRepository: DesignShareRepository = {
  async create(record) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO DesignShareLink (
        id, organizationId, projectId, reportDigest, tokenHash, passwordHash,
        profileJson, publicSnapshotJson, expiresAt, revokedAt, createdAt
      ) VALUES (
        ${record.id}, ${record.organizationId}, ${record.projectId},
        ${record.reportDigest}, ${record.tokenHash}, ${record.passwordHash},
        ${JSON.stringify(record.profile)}, ${record.publicSnapshotJson},
        ${record.expiresAt}, ${record.revokedAt}, ${record.createdAt}
      )
    `);
  },

  async findByTokenHash(tokenHash) {
    const rows = await prisma.$queryRaw<ShareRow[]>(Prisma.sql`
      SELECT id, organizationId, projectId, reportDigest, tokenHash, passwordHash,
             profileJson, publicSnapshotJson, expiresAt, revokedAt, createdAt
      FROM DesignShareLink
      WHERE tokenHash = ${tokenHash}
      LIMIT 1
    `);
    const row = rows[0];
    if (!row) return null;
    return { ...row, profile: parseProfile(row.profileJson) } satisfies DesignShareRecord;
  },

  async revoke(shareId, organizationId, revokedAt) {
    const changed = await prisma.$executeRaw(Prisma.sql`
      UPDATE DesignShareLink
      SET revokedAt = ${revokedAt}
      WHERE id = ${shareId} AND organizationId = ${organizationId} AND revokedAt IS NULL
    `);
    return changed === 1;
  },

  async audit(input: { shareId: string | null; event: DesignShareAuditEvent; at: Date; detail?: string }) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO DesignShareAuditEvent (id, shareId, eventType, detail, createdAt)
      VALUES (${randomUUID()}, ${input.shareId}, ${input.event}, ${input.detail ?? null}, ${input.at})
    `);
  },
};