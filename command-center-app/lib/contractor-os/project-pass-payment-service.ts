import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { assertCommercialProjectBelongsToTenant } from "./commercial-access";
import {
  buildProjectPassCheckoutRequest,
  type ProjectPassCheckoutIntent,
} from "./project-pass-checkout-policy";
import { applyVerifiedProjectPassEvent } from "./project-pass-repository";
import {
  toVerifiedProjectPassEvent,
  type ProjectPassCheckoutSession,
  type ProjectPassPaymentProvider,
  type ProjectPassWebhookRequest,
} from "./project-pass-provider";

export type TrustedProjectPassCheckoutRequest = ProjectPassCheckoutIntent;

function configuredCheckoutOrigins() {
  const configured = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter((value): value is string => Boolean(value && value.trim()));

  const origins = new Set<string>();
  for (const value of configured) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        origins.add(parsed.origin);
      }
    } catch {
      // Invalid deployment configuration is ignored here; checkout fails
      // closed when the requested return URL does not match a trusted origin.
    }
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return origins;
}

/**
 * Starts a provider checkout from trusted server-side tenant/project/product
 * inputs. The checkout policy owns price/currency and return-URL validation;
 * this service additionally proves the project belongs to the selected tenant
 * before invoking the provider.
 *
 * The returned checkout URL is navigation only and never grants entitlement.
 */
export async function createProjectPassCheckout(
  provider: ProjectPassPaymentProvider,
  request: TrustedProjectPassCheckoutRequest
): Promise<ProjectPassCheckoutSession> {
  if (!provider.name.trim()) {
    throw new Error("Project Pass provider name is required");
  }

  const providerRequest = buildProjectPassCheckoutRequest(request, {
    trustedOrigins: configuredCheckoutOrigins(),
  });

  const projectRows = await prisma.$queryRaw<Array<{ organizationId: string }>>(Prisma.sql`
    SELECT organizationId FROM ProjectInstallation
    WHERE id=${providerRequest.projectInstallationId}
      AND organizationId=${providerRequest.organizationId}
    LIMIT 1
  `);
  assertCommercialProjectBelongsToTenant(
    providerRequest.organizationId,
    projectRows[0]
  );

  return provider.createCheckout(providerRequest);
}

/**
 * Trusted webhook orchestration boundary.
 *
 * Provider-specific signature/authenticity validation happens first. Only the
 * normalized event returned by verifyWebhook can reach the persistence layer
 * that records payment authority and grants/revokes entitlement.
 */
export async function processProjectPassWebhook(
  provider: ProjectPassPaymentProvider,
  request: ProjectPassWebhookRequest
) {
  const verifiedProviderEvent = await provider.verifyWebhook(request);
  const verifiedEvent = toVerifiedProjectPassEvent(
    provider,
    verifiedProviderEvent
  );

  return applyVerifiedProjectPassEvent(verifiedEvent);
}
