import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

import { createProTrial, type TrialRecord } from "./subscription-lifecycle";

type TrialRow = {
  organizationId: string;
  plan: "PRO";
  startsAt: Date;
  endsAt: Date;
};

function toTrialRecord(row: TrialRow): TrialRecord {
  return {
    organizationId: row.organizationId,
    plan: row.plan,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
  };
}

/**
 * Reads the app-owned acquisition trial for one organization.
 * The organization id must come from the authenticated server session; never
 * from an untrusted client-selected organization when authorizing features.
 */
export async function getOrganizationProTrial(
  organizationId: string
): Promise<TrialRecord | null> {
  if (!organizationId.trim()) {
    throw new Error("Trial organization is required");
  }

  const rows = await prisma.$queryRaw<TrialRow[]>`
    SELECT organizationId, plan, startsAt, endsAt
    FROM OrganizationSubscriptionTrial
    WHERE organizationId = ${organizationId}
    LIMIT 1
  `;

  return rows[0] ? toTrialRecord(rows[0]) : null;
}

/**
 * Starts the 30-day Pro acquisition trial exactly once per organization.
 *
 * A unique organizationId constraint in the database prevents concurrent or
 * client-triggered retries from minting additional trial windows. Existing
 * trials are returned unchanged, including expired trials, so trial expiry
 * cannot be reset by signing in again or repeating the start action.
 */
export async function startOrganizationProTrialOnce(
  organizationId: string,
  startsAt = new Date()
): Promise<TrialRecord> {
  const existing = await getOrganizationProTrial(organizationId);
  if (existing) return existing;

  const trial = createProTrial(organizationId, startsAt);

  try {
    await prisma.$executeRaw`
      INSERT INTO OrganizationSubscriptionTrial
        (id, organizationId, plan, startsAt, endsAt, createdAt, updatedAt)
      VALUES
        (${randomUUID()}, ${trial.organizationId}, 'PRO', ${new Date(
          trial.startsAt
        )}, ${new Date(trial.endsAt)}, NOW(3), NOW(3))
    `;
  } catch (error) {
    // A concurrent request may have won the unique organizationId insert.
    // Re-read server state instead of extending/restarting the trial.
    const concurrent = await getOrganizationProTrial(organizationId);
    if (concurrent) return concurrent;
    throw error;
  }

  const persisted = await getOrganizationProTrial(organizationId);
  if (!persisted) {
    throw new Error("Pro trial was not persisted");
  }

  return persisted;
}
