import { resolveProjectPassStripeConfig } from "./project-pass-stripe-config";
import { StripeProjectPassProvider } from "./project-pass-stripe-provider";
import type { ProjectPassPaymentProvider } from "./project-pass-provider";

export type ProjectPassProviderResolution =
  | { configured: true; provider: ProjectPassPaymentProvider }
  | { configured: false; reason: "PROVIDER_NOT_CONFIGURED" };

/**
 * Centralized, fail-closed Project Pass provider selection.
 *
 * Stripe is the explicitly selected provider for NCI-016. It is registered
 * only when both server-side Stripe secrets are present; otherwise checkout
 * and webhook handling remain locked.
 */
export function resolveProjectPassPaymentProvider(): ProjectPassProviderResolution {
  const stripe = resolveProjectPassStripeConfig();
  if (!stripe.configured) {
    return {
      configured: false,
      reason: "PROVIDER_NOT_CONFIGURED",
    };
  }

  return {
    configured: true,
    provider: new StripeProjectPassProvider(stripe.config),
  };
}
