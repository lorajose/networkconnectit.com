import { applyVerifiedProjectPassEvent } from "./project-pass-repository";
import {
  toVerifiedProjectPassEvent,
  type ProjectPassCheckoutRequest,
  type ProjectPassCheckoutSession,
  type ProjectPassPaymentProvider,
  type ProjectPassWebhookRequest,
} from "./project-pass-provider";

/**
 * Starts a provider checkout from trusted server-side project/product inputs.
 * The returned checkout URL is navigation only and never grants entitlement.
 */
export async function createProjectPassCheckout(
  provider: ProjectPassPaymentProvider,
  request: ProjectPassCheckoutRequest
): Promise<ProjectPassCheckoutSession> {
  if (!provider.name.trim()) {
    throw new Error("Project Pass provider name is required");
  }

  return provider.createCheckout(request);
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
