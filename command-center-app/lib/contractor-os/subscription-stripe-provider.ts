import { createHmac, timingSafeEqual } from "node:crypto";

import type { SubscriptionStatus } from "./subscription-lifecycle";
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

type StripeSubscription = {
  id?: unknown;
  customer?: unknown;
  status?: unknown;
  current_period_start?: unknown;
  current_period_end?: unknown;
  cancel_at_period_end?: unknown;
  metadata?: unknown;
  items?: unknown;
};

type StripeEvent = {
  id?: unknown;
  type?: unknown;
  created?: unknown;
  data?: { object?: unknown };
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

export type VerifiedSubscriptionEvent = {
  provider: "stripe";
  providerEventId: string;
  providerSubscriptionId: string;
  providerCustomerId: string;
  eventType: string;
  organizationId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  verifiedAt: Date;
};

const STRIPE_CHECKOUT_API = "https://api.stripe.com/v1/checkout/sessions";
const SIGNATURE_TOLERANCE_SECONDS = 300;

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Stripe ${field} is required`);
  }
  return value.trim();
}

function secureSignatureMatch(expected: string, candidates: string[]) {
  const expectedBuffer = Buffer.from(expected, "utf8");
  return candidates.some((candidate) => {
    const candidateBuffer = Buffer.from(candidate, "utf8");
    return (
      candidateBuffer.length === expectedBuffer.length &&
      timingSafeEqual(candidateBuffer, expectedBuffer)
    );
  });
}

function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  nowMs: number
) {
  if (!signatureHeader) throw new Error("Stripe signature is required");

  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === "t") timestamp = Number(value);
    if (key === "v1" && value) signatures.push(value);
  }

  if (!timestamp || !Number.isFinite(timestamp) || signatures.length === 0) {
    throw new Error("Stripe signature header is invalid");
  }

  const nowSeconds = Math.floor(nowMs / 1000);
  if (Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
    throw new Error("Stripe webhook timestamp is outside the allowed tolerance");
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  if (!secureSignatureMatch(expected, signatures)) {
    throw new Error("Stripe webhook signature is invalid");
  }
}

function metadataSubscriptionPlan(value: unknown): SubscriptionPlan {
  if (value !== "PRO" && value !== "BUSINESS") {
    throw new Error("Unsupported subscription plan in Stripe metadata");
  }
  return value;
}

function trustedSubscriptionPlan(
  subscription: StripeSubscription,
  config: SubscriptionStripeConfig,
  metadataPlan: SubscriptionPlan
): SubscriptionPlan {
  const items =
    subscription.items && typeof subscription.items === "object"
      ? (subscription.items as { data?: unknown }).data
      : null;

  if (!Array.isArray(items) || items.length !== 1) {
    throw new Error("Stripe subscription must contain exactly one plan item");
  }

  const item = items[0];
  const price =
    item && typeof item === "object"
      ? (item as { price?: unknown }).price
      : null;
  const priceId = requiredString(
    price && typeof price === "object" ? (price as { id?: unknown }).id : null,
    "subscription price id"
  );

  const plan =
    priceId === config.priceIds.PRO
      ? "PRO"
      : priceId === config.priceIds.BUSINESS
        ? "BUSINESS"
        : null;

  if (!plan) {
    throw new Error("Stripe subscription uses an untrusted price id");
  }

  if (metadataPlan !== plan) {
    throw new Error("Stripe subscription plan metadata does not match its trusted price");
  }

  return plan;
}

function subscriptionStatus(value: unknown): SubscriptionStatus {
  switch (value) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return "INCOMPLETE";
    default:
      throw new Error("Unsupported Stripe subscription status");
  }
}

function unixDate(value: unknown): Date | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Stripe subscription period timestamp is invalid");
  }
  return new Date(value * 1000);
}

/**
 * Stripe Checkout boundary for NCI-017 recurring plans.
 *
 * Checkout navigation never grants entitlement. Only a verified Stripe
 * subscription lifecycle event can be normalized into persisted access.
 */
export class StripeSubscriptionProvider {
  readonly name = "stripe" as const;

  constructor(
    private readonly config: SubscriptionStripeConfig,
    private readonly fetchImpl: StripeFetch = fetch,
    private readonly now: () => number = Date.now
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

  verifyWebhook(rawBody: string, signatureHeader: string | null): VerifiedSubscriptionEvent {
    verifyStripeSignature(
      rawBody,
      signatureHeader,
      this.config.webhookSecret,
      this.now()
    );

    const event = JSON.parse(rawBody) as StripeEvent;
    const providerEventId = requiredString(event.id, "event id");
    const eventType = requiredString(event.type, "event type");

    if (
      eventType !== "customer.subscription.created" &&
      eventType !== "customer.subscription.updated" &&
      eventType !== "customer.subscription.deleted"
    ) {
      throw new Error("Unsupported Stripe subscription event");
    }

    const subscription = (event.data?.object ?? null) as StripeSubscription | null;
    if (!subscription || typeof subscription !== "object") {
      throw new Error("Stripe Subscription is required");
    }

    const metadata =
      subscription.metadata && typeof subscription.metadata === "object"
        ? (subscription.metadata as Record<string, unknown>)
        : {};
    const metadataPlan = metadataSubscriptionPlan(metadata.plan);
    const plan = trustedSubscriptionPlan(subscription, this.config, metadataPlan);

    return {
      provider: this.name,
      providerEventId,
      providerSubscriptionId: requiredString(subscription.id, "subscription id"),
      providerCustomerId: requiredString(subscription.customer, "customer id"),
      eventType,
      organizationId: requiredString(metadata.organizationId, "organization metadata"),
      plan,
      status:
        eventType === "customer.subscription.deleted"
          ? "CANCELED"
          : subscriptionStatus(subscription.status),
      currentPeriodStart: unixDate(subscription.current_period_start),
      currentPeriodEnd: unixDate(subscription.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
      verifiedAt: new Date(
        (typeof event.created === "number" && Number.isFinite(event.created)
          ? event.created * 1000
          : this.now())
      ),
    };
  }
}
