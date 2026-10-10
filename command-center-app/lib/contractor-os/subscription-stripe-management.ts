import type { SubscriptionPlan } from "./subscription-plan";
import {
  subscriptionStripePriceId,
  type SubscriptionStripeConfig,
} from "./subscription-stripe-config";

type StripeFetch = (input: string, init?: RequestInit) => Promise<Response>;

type ManagedStripeSubscription = {
  id?: unknown;
  items?: unknown;
};

type StripeSchedule = {
  id?: unknown;
  phases?: unknown;
};

type StripePrice = {
  id?: unknown;
  recurring?: unknown;
};

const STRIPE_API = "https://api.stripe.com/v1";

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Stripe ${field} is required`);
  }
  return value.trim();
}

function requiredPositiveInteger(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Stripe ${field} is invalid`);
  }
  return value;
}

function formHeaders(secretKey: string) {
  return {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

export class StripeSubscriptionManagement {
  constructor(
    private readonly config: SubscriptionStripeConfig,
    private readonly fetchImpl: StripeFetch = fetch
  ) {}

  private async loadSubscription(providerSubscriptionId: string) {
    const subscriptionId = requiredString(providerSubscriptionId, "subscription id");
    const response = await this.fetchImpl(
      `${STRIPE_API}/subscriptions/${encodeURIComponent(subscriptionId)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${this.config.secretKey}` },
        cache: "no-store",
      }
    );
    if (!response.ok) throw new Error("Stripe subscription retrieval failed");

    const subscription = (await response.json()) as ManagedStripeSubscription;
    if (requiredString(subscription.id, "subscription id") !== subscriptionId) {
      throw new Error("Stripe returned an unexpected subscription");
    }

    const items =
      subscription.items && typeof subscription.items === "object"
        ? (subscription.items as { data?: unknown }).data
        : null;
    if (!Array.isArray(items) || items.length !== 1) {
      throw new Error("Stripe subscription must contain exactly one plan item");
    }

    const item = items[0] as { id?: unknown; price?: unknown };
    const itemId = requiredString(item.id, "subscription item id");
    const price =
      item.price && typeof item.price === "object"
        ? (item.price as { id?: unknown })
        : null;
    const priceId = requiredString(price?.id, "subscription price id");
    const plan: SubscriptionPlan =
      priceId === this.config.priceIds.PRO
        ? "PRO"
        : priceId === this.config.priceIds.BUSINESS
          ? "BUSINESS"
          : (() => {
              throw new Error("Stripe subscription uses an untrusted price id");
            })();

    return { itemId, priceId, plan };
  }

  async upgrade(request: {
    providerSubscriptionId: string;
    organizationId: string;
    toPlan: SubscriptionPlan;
  }) {
    const current = await this.loadSubscription(request.providerSubscriptionId);
    if (current.plan === request.toPlan) {
      throw new Error("Requested subscription plan is already active");
    }

    const params = new URLSearchParams();
    params.set("items[0][id]", current.itemId);
    params.set("items[0][price]", subscriptionStripePriceId(this.config, request.toPlan));
    params.set("metadata[organizationId]", request.organizationId);
    params.set("metadata[plan]", request.toPlan);
    params.set("proration_behavior", "always_invoice");
    params.set("payment_behavior", "error_if_incomplete");
    params.set("cancel_at_period_end", "false");

    const response = await this.fetchImpl(
      `${STRIPE_API}/subscriptions/${encodeURIComponent(request.providerSubscriptionId)}`,
      {
        method: "POST",
        headers: formHeaders(this.config.secretKey),
        body: params.toString(),
        cache: "no-store",
      }
    );
    if (!response.ok) throw new Error("Stripe subscription upgrade failed");
  }

  async cancelAtPeriodEnd(providerSubscriptionId: string) {
    await this.loadSubscription(providerSubscriptionId);
    const params = new URLSearchParams();
    params.set("cancel_at_period_end", "true");
    const response = await this.fetchImpl(
      `${STRIPE_API}/subscriptions/${encodeURIComponent(providerSubscriptionId)}`,
      {
        method: "POST",
        headers: formHeaders(this.config.secretKey),
        body: params.toString(),
        cache: "no-store",
      }
    );
    if (!response.ok) {
      throw new Error("Stripe subscription cancellation scheduling failed");
    }
  }

  async downgradeAtPeriodEnd(request: {
    providerSubscriptionId: string;
    organizationId: string;
    toPlan: SubscriptionPlan;
  }): Promise<{ providerScheduleId: string; effectiveAt: Date }> {
    const current = await this.loadSubscription(request.providerSubscriptionId);
    if (current.plan === request.toPlan) {
      throw new Error("Requested subscription plan is already active");
    }

    const createParams = new URLSearchParams();
    createParams.set("from_subscription", request.providerSubscriptionId);
    const createResponse = await this.fetchImpl(`${STRIPE_API}/subscription_schedules`, {
      method: "POST",
      headers: formHeaders(this.config.secretKey),
      body: createParams.toString(),
      cache: "no-store",
    });
    if (!createResponse.ok) {
      throw new Error("Stripe subscription downgrade schedule creation failed");
    }

    const schedule = (await createResponse.json()) as StripeSchedule;
    const scheduleId = requiredString(schedule.id, "subscription schedule id");
    if (!Array.isArray(schedule.phases) || schedule.phases.length !== 1) {
      throw new Error("Stripe subscription schedule has an unexpected phase layout");
    }

    const phase = schedule.phases[0] as { start_date?: unknown; end_date?: unknown };
    const phaseStart = requiredPositiveInteger(phase.start_date, "schedule phase start");
    const phaseEnd = requiredPositiveInteger(phase.end_date, "schedule phase end");
    if (phaseEnd <= phaseStart) {
      throw new Error("Stripe subscription schedule phase dates are invalid");
    }

    const targetPrice = subscriptionStripePriceId(this.config, request.toPlan);
    const priceResponse = await this.fetchImpl(
      `${STRIPE_API}/prices/${encodeURIComponent(targetPrice)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${this.config.secretKey}` },
        cache: "no-store",
      }
    );
    if (!priceResponse.ok) throw new Error("Stripe downgrade price retrieval failed");

    const price = (await priceResponse.json()) as StripePrice;
    if (requiredString(price.id, "price id") !== targetPrice) {
      throw new Error("Stripe returned an unexpected downgrade price");
    }
    const recurring =
      price.recurring && typeof price.recurring === "object"
        ? (price.recurring as { interval?: unknown; interval_count?: unknown })
        : null;
    const interval = requiredString(recurring?.interval, "price recurring interval");
    if (!["day", "week", "month", "year"].includes(interval)) {
      throw new Error("Stripe downgrade price recurring interval is unsupported");
    }
    const intervalCount =
      recurring?.interval_count == null
        ? 1
        : requiredPositiveInteger(recurring.interval_count, "price recurring interval count");

    const params = new URLSearchParams();
    params.set("end_behavior", "release");
    params.set("phases[0][start_date]", String(phaseStart));
    params.set("phases[0][end_date]", String(phaseEnd));
    params.set("phases[0][items][0][price]", current.priceId);
    params.set("phases[0][items][0][quantity]", "1");
    params.set("phases[0][metadata][organizationId]", request.organizationId);
    params.set("phases[0][metadata][plan]", current.plan);
    params.set("phases[0][proration_behavior]", "none");
    params.set("phases[1][start_date]", String(phaseEnd));
    params.set("phases[1][items][0][price]", targetPrice);
    params.set("phases[1][items][0][quantity]", "1");
    params.set("phases[1][duration][interval]", interval);
    params.set("phases[1][duration][interval_count]", String(intervalCount));
    params.set("phases[1][metadata][organizationId]", request.organizationId);
    params.set("phases[1][metadata][plan]", request.toPlan);
    params.set("phases[1][proration_behavior]", "none");

    const updateResponse = await this.fetchImpl(
      `${STRIPE_API}/subscription_schedules/${encodeURIComponent(scheduleId)}`,
      {
        method: "POST",
        headers: formHeaders(this.config.secretKey),
        body: params.toString(),
        cache: "no-store",
      }
    );
    if (!updateResponse.ok) {
      throw new Error("Stripe subscription downgrade scheduling failed");
    }

    return {
      providerScheduleId: scheduleId,
      effectiveAt: new Date(phaseEnd * 1000),
    };
  }
}
