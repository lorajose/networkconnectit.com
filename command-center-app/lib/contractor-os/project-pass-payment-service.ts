import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { assertCommercialProjectBelongsToTenant } from "./commercial-access";
import { getProjectPassCatalogEntry } from "./project-pass-catalog";
import type { ProjectPassProduct } from "./project-pass";
import { applyVerifiedProjectPassEvent } from "./project-pass-repository";
import {
  toVerifiedProjectPassEvent,
  type ProjectPassCheckoutRequest,
  type ProjectPassCheckoutSession,
  type ProjectPassPaymentProvider,
  type ProjectPassWebhookRequest,
} from "./project-pass-provider";

export type TrustedProjectPassCheckoutRequest = {
  organizationId: string;
  projectInstallationId: string;
  product: ProjectPassProduct;
  successUrl: string;
  cancelUrl: string;
};

function required(value: string, name: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

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
      // Invalid deployment configuration is ignored here; checkout will fail
      // closed below when no trusted origin matches the requested return URL.
    }
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return origins;
}

function requireTrustedReturnUrl(value: string, name: string) {
  const normalized = required(value, name);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${name} must use http or https`);
  }

  const trustedOrigins = configuredCheckoutOrigins();
  if (!trustedOrigins.has(parsed.origin)) {
    throw new Error(`${name} origin is not allowed for Project Pass checkout`);
  }

  return parsed.toString();
}

/**
 * Starts a provider checkout from trusted server-side tenant/project/product
 * inputs. Price and currency are resolved exclusively from the server-owned
 * Project Pass catalog; callers cannot override commercial terms.
 *
 * Return URLs are restricted to configured application origins. The returned
 * checkout URL is navigation only and never grants entitlement.
 */
export async function createProjectPassCheckout(
  provider: ProjectPassPaymentProvider,
  request: TrustedProjectPassCheckoutRequest
): Promise<ProjectPassCheckoutSession> {
  if (!provider.name.trim()) {
    throw new Error("Project Pass provider name is required");
  }

  const organizationId = required(request.organizationId, "organizationId");
  const projectInstallationId = required(
    request.projectInstallationId,
    "projectInstallationId"
  );
  const catalogEntry = getProjectPassCatalogEntry(request.product);

  const projectRows = await prisma.$queryRaw<Array<{ organizationId: string }>>(Prisma.sql`
    SELECT organizationId FROM ProjectInstallation
    WHERE id=${projectInstallationId} AND organizationId=${organizationId}
    LIMIT 1
  `);
  assertCommercialProjectBelongsToTenant(organizationId, projectRows[0]);

  const providerRequest: ProjectPassCheckoutRequest = {
    organizationId,
    projectInstallationId,
    product: catalogEntry.product,
    amountCents: catalogEntry.amountCents,
    currency: catalogEntry.currency,
    successUrl: requireTrustedReturnUrl(request.successUrl, "successUrl"),
    cancelUrl: requireTrustedReturnUrl(request.cancelUrl, "cancelUrl"),
  };

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
