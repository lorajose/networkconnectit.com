import type { SubscriptionPlan } from "./subscription-plan";

export type SubscriptionStripeConfig = {
  secretKey: string;
  webhookSecret: string;
  priceIds: Readonly<Record<SubscriptionPlan, string>>;
};

export type SubscriptionStripeConfigResolution =
  | { configured: true; config: SubscriptionStripeConfig }
  | { configured: false; reason: "STRIPE_SUBSCRIPTIONS_NOT_CONFIGURED" };

type SubscriptionStripeEnv = {
  STRIPE_SECRET_KEY?: string;
  STRIPE_SUBSCRIPTION_WEBHOOK_SECRET?: string;
  STRIPE_PRO_PRICE_ID?: string;
  STRIPE_BUSINESS_PRICE_ID?: string;
};

function stripePriceId(value: string | undefined): string | null {
  const priceId = value?.trim() ?? "";
  return /^price_[A-Za-z0-9]+$/.test(priceId) ? priceId : null;
}

/**
 * Server-only Stripe configuration for recurring NCI-017 subscriptions.
 *
 * Browser input may select PRO or BUSINESS, but it never supplies a Stripe
 * price identifier. The plan-to-price mapping remains server-owned and this
 * resolver fails closed until the API key, dedicated subscription webhook
 * secret and both plan price IDs are configured.
 */
export function resolveSubscriptionStripeConfig(
  env?: SubscriptionStripeEnv
): SubscriptionStripeConfigResolution {
  const source: SubscriptionStripeEnv = env ?? {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_SUBSCRIPTION_WEBHOOK_SECRET:
      process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET,
    STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID,
    STRIPE_BUSINESS_PRICE_ID: process.env.STRIPE_BUSINESS_PRICE_ID,
  };

  const secretKey = source.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = source.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET?.trim();
  const proPriceId = stripePriceId(source.STRIPE_PRO_PRICE_ID);
  const businessPriceId = stripePriceId(source.STRIPE_BUSINESS_PRICE_ID);

  if (!secretKey || !webhookSecret || !proPriceId || !businessPriceId) {
    return {
      configured: false,
      reason: "STRIPE_SUBSCRIPTIONS_NOT_CONFIGURED",
    };
  }

  return {
    configured: true,
    config: {
      secretKey,
      webhookSecret,
      priceIds: {
        PRO: proPriceId,
        BUSINESS: businessPriceId,
      },
    },
  };
}

export function subscriptionStripePriceId(
  config: SubscriptionStripeConfig,
  plan: SubscriptionPlan
): string {
  const priceId = config.priceIds[plan];
  if (!priceId) {
    throw new Error("Stripe price is not configured for subscription plan");
  }
  return priceId;
}
