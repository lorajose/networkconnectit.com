import { resolveSubscriptionStripeConfig } from "./subscription-stripe-config";
import { StripeSubscriptionProvider } from "./subscription-stripe-provider";

export type SubscriptionProviderResolution =
  | { configured: true; provider: StripeSubscriptionProvider }
  | { configured: false; reason: "PROVIDER_NOT_CONFIGURED" };

/**
 * Centralized, fail-closed provider selection for recurring subscriptions.
 *
 * The recurring provider is independent from Project Pass configuration so a
 * missing subscription webhook secret or plan price ID cannot accidentally
 * open a partially configured billing path.
 */
export function resolveSubscriptionPaymentProvider(): SubscriptionProviderResolution {
  const stripe = resolveSubscriptionStripeConfig();

  if (!stripe.configured) {
    return {
      configured: false,
      reason: "PROVIDER_NOT_CONFIGURED",
    };
  }

  return {
    configured: true,
    provider: new StripeSubscriptionProvider(stripe.config),
  };
}
