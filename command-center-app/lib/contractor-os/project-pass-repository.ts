import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { assertCommercialProjectBelongsToTenant } from "./commercial-access";
import {
  PROJECT_PASS_PRODUCTS,
  type ProjectPassPaymentState,
  type ProjectPassProduct,
} from "./project-pass";

export type VerifiedProjectPassEvent = {
  organizationId: string;
  projectInstallationId: string;
  product: ProjectPassProduct;
  provider: string;
  providerEventId: string;
  providerPaymentId: string;
  eventType: string;
  state: ProjectPassPaymentState;
  amountCents: number;
  currency: string;
  verifiedAt: Date;
};

function required(value: string, name: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

/**
 * Trusted server boundary for payment-provider events.
 * The caller must verify provider authenticity/signature before invoking this function.
 * Browser return parameters, sessionStorage and client callbacks must never call this directly.
 */
export async function applyVerifiedProjectPassEvent(input: VerifiedProjectPassEvent) {
  const organizationId = required(input.organizationId, "organizationId");
  const projectInstallationId = required(input.projectInstallationId, "projectInstallationId");
  const provider = required(input.provider, "provider");
  const providerEventId = required(input.providerEventId, "providerEventId");
  const providerPaymentId = required(input.providerPaymentId, "providerPaymentId");
  const eventType = required(input.eventType, "eventType");
  const currency = required(input.currency, "currency").toUpperCase();

  if (!PROJECT_PASS_PRODUCTS.includes(input.product)) throw new Error("Unsupported Project Pass product");
  if (!Number.isInteger(input.amountCents) || input.amountCents < 0) throw new Error("amountCents must be a non-negative integer");
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("currency must be a 3-letter ISO code");
  if (!(input.verifiedAt instanceof Date) || Number.isNaN(input.verifiedAt.getTime())) {
    throw new Error("verifiedAt must be a valid trusted timestamp");
  }

  const projectRows = await prisma.$queryRaw<Array<{ organizationId: string }>>(Prisma.sql`
    SELECT organizationId FROM ProjectInstallation
    WHERE id=${projectInstallationId} AND organizationId=${organizationId}
    LIMIT 1
  `);
  assertCommercialProjectBelongsToTenant(organizationId, projectRows[0]);

  return prisma.$transaction(async (tx) => {
    const priorEvent = await tx.$queryRaw<Array<{ paymentId: string }>>(Prisma.sql`
      SELECT paymentId FROM ProjectPassPaymentEvent
      WHERE provider=${provider} AND providerEventId=${providerEventId}
      LIMIT 1
    `);
    if (priorEvent[0]) {
      return { replayed: true, paymentId: priorEvent[0].paymentId };
    }

    const paymentRows = await tx.$queryRaw<Array<{
      id: string;
      organizationId: string;
      projectInstallationId: string;
      product: string;
      state: ProjectPassPaymentState;
      verifiedAt: Date | null;
    }>>(Prisma.sql`
      SELECT id,organizationId,projectInstallationId,product,state,verifiedAt
      FROM ProjectPassPayment
      WHERE provider=${provider} AND providerPaymentId=${providerPaymentId}
      LIMIT 1
      FOR UPDATE
    `);

    let paymentId = paymentRows[0]?.id;
    if (paymentRows[0]) {
      if (
        paymentRows[0].organizationId !== organizationId ||
        paymentRows[0].projectInstallationId !== projectInstallationId ||
        paymentRows[0].product !== input.product
      ) {
        throw new Error("Provider payment is already bound to a different tenant, project or product");
      }
      const currentState = paymentRows[0].state;
      const currentVerifiedAt = paymentRows[0].verifiedAt;
      const staleEvent = currentVerifiedAt && input.verifiedAt < currentVerifiedAt;
      const allowedTransition =
        currentState === input.state ||
        (currentState === "PENDING" && (input.state === "PAID" || input.state === "FAILED")) ||
        (currentState === "FAILED" && input.state === "PAID") ||
        (currentState === "PAID" && input.state === "REFUNDED");

      if (staleEvent || !allowedTransition) {
        throw new Error("Project Pass payment event would cause an unsafe state transition");
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE ProjectPassPayment
        SET state=${input.state},amountCents=${input.amountCents},currency=${currency},
            verifiedAt=${input.verifiedAt},updatedAt=NOW(3)
        WHERE id=${paymentId} AND organizationId=${organizationId}
      `);
    } else {
      paymentId = randomUUID();
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO ProjectPassPayment
          (id,organizationId,projectInstallationId,product,provider,providerPaymentId,state,amountCents,currency,verifiedAt,createdAt,updatedAt)
        VALUES
          (${paymentId},${organizationId},${projectInstallationId},${input.product},${provider},${providerPaymentId},${input.state},${input.amountCents},${currency},${input.verifiedAt},NOW(3),NOW(3))
      `);
    }

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO ProjectPassPaymentEvent
        (id,organizationId,projectInstallationId,paymentId,provider,providerEventId,eventType,verified,receivedAt)
      VALUES
        (${randomUUID()},${organizationId},${projectInstallationId},${paymentId},${provider},${providerEventId},${eventType},true,NOW(3))
    `);

    if (input.state === "PAID") {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO ProjectPassEntitlement
          (id,organizationId,projectInstallationId,product,paymentId,grantedAt,revokedAt,createdAt,updatedAt)
        VALUES
          (${randomUUID()},${organizationId},${projectInstallationId},${input.product},${paymentId},${input.verifiedAt},NULL,NOW(3),NOW(3))
        ON DUPLICATE KEY UPDATE
          paymentId=VALUES(paymentId),grantedAt=VALUES(grantedAt),revokedAt=NULL,updatedAt=NOW(3)
      `);
    } else if (input.state === "REFUNDED") {
      // A refund may revoke only the entitlement currently authorized by
      // that exact payment. An older refunded payment must never revoke a
      // newer repurchase, and FAILED/PENDING events never revoke access.
      await tx.$executeRaw(Prisma.sql`
        UPDATE ProjectPassEntitlement
        SET revokedAt=${input.verifiedAt},updatedAt=NOW(3)
        WHERE organizationId=${organizationId}
          AND projectInstallationId=${projectInstallationId}
          AND product=${input.product}
          AND paymentId=${paymentId}
          AND revokedAt IS NULL
      `);
    }

    return { replayed: false, paymentId };
  });
}

export async function hasServerVerifiedProjectPass(input: {
  organizationId: string;
  projectInstallationId: string;
  product: ProjectPassProduct;
}) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT e.id
    FROM ProjectPassEntitlement e
    INNER JOIN ProjectPassPayment p ON p.id=e.paymentId
    WHERE e.organizationId=${input.organizationId}
      AND e.projectInstallationId=${input.projectInstallationId}
      AND e.product=${input.product}
      AND e.revokedAt IS NULL
      AND p.organizationId=e.organizationId
      AND p.projectInstallationId=e.projectInstallationId
      AND p.product=e.product
      AND p.state='PAID'
      AND p.verifiedAt IS NOT NULL
    LIMIT 1
  `);
  return Boolean(rows[0]);
}
