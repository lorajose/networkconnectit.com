import type { SubscriptionPlan } from "./subscription-plan";
import {
  subscriptionStripePriceId,
  type SubscriptionStripeConfig,
} from "./subscription-stripe-config";

type StripeFetch = (input: string, init?: RequestInit) => Promise<Response>;

type StripeCheckoutSession = {
  id?: unknown;
  url?: unknown;
};

export type SubscriptionCheckoutRequest = {
  organizationId: string;
  plan: SubscriptionPlan;
  successUrl: string;
  cancelUrl: string;
};

export type SubscriptionCheckoutSession = {
  provider: "stripe";
  providerCheckoutId: string;
  checkoutUrl: string;
};

const STRIPE_CHECKOUT_API = "https://api.stripe.com/v1/checkout/sessions";

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Stripe ${field} is required`);
  }
  return value.trim();
}

/**
 * Stripe Checkout boundary for NCI-017 recurring plans.
 *
 * The caller supplies only the server-resolved organization and plan. Stripe
 * price IDs are looked up from trusted server configuration. Checkout success
 * is navigation only; it must never grant subscription entitlement. A later
 * verified subscription webhook is responsible for persisted access.
 */
export class StripeSubscriptionProvider {
  readonly name = "stripe" as const;

  constructor(
    private readonly config: SubscriptionStripeConfig,
    private readonly fetchImpl: StripeFetch = fetch
  ) {}

  async createCheckout(
    request: SubscriptionCheckoutRequest
  ): Promise<SubscriptionCheckoutSession> {
    const organizationId = request.organizationId.trim();
    if (!organizationId) {
      throw new Error("Organization is required for subscription checkout");
    }

    const priceId = subscriptionStripePriceId(this.config, request.plan);
    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("success_url", request.successUrl);
    params.set("cancel_url", request.cancelUrl);
    params.set("client_reference_id", organizationId);
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price]", priceId);
    params.set("metadata[organizationId]", organizationId);
    params.set("metadata[plan]", request.plan);
    params.set("subscription_data[metadata][organizationId]", organizationId);
    params.set("subscription_data[metadata][plan]", request.plan);

    const response = await this.fetchImpl(STRIPE_CHECKOUT_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Stripe subscription Checkout Session creation failed");
    }

    const session = (await response.json()) as StripeCheckoutSession;
    const providerCheckoutId = requiredString(session.id, "Checkout Session id");
    const checkoutUrl = requiredString(session.url, "Checkout Session URL");

    if (!checkoutUrl.startsWith("https://checkout.stripe.com/")) {
      throw new Error("Stripe returned an unexpected Checkout URL");
    }

    return {
      provider: this.name,
      providerCheckoutId,
      checkoutUrl,
    };
  }
}
