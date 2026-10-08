import { createHmac, timingSafeEqual } from "node:crypto";

import type {
  ProjectPassCheckoutRequest,
  ProjectPassCheckoutSession,
  ProjectPassPaymentProvider,
  ProjectPassWebhookRequest,
  VerifiedProviderProjectPassEvent,
} from "./project-pass-provider";
import type { ProjectPassProduct } from "./project-pass";
import type { ProjectPassStripeConfig } from "./project-pass-stripe-config";

type StripeFetch = (input: string, init?: RequestInit) => Promise<Response>;

type StripeCheckoutSession = {
  id?: unknown;
  url?: unknown;
  amount_total?: unknown;
  currency?: unknown;
  payment_status?: unknown;
  payment_intent?: unknown;
  metadata?: unknown;
};

type StripeCharge = {
  amount?: unknown;
  amount_refunded?: unknown;
  currency?: unknown;
  refunded?: unknown;
  payment_intent?: unknown;
  metadata?: unknown;
};

type StripeCheckoutSessionList = {
  data?: unknown;
};

type StripeEvent = {
  id?: unknown;
  type?: unknown;
  created?: unknown;
  data?: { object?: unknown };
};

const STRIPE_API = "https://api.stripe.com/v1/checkout/sessions";
const SIGNATURE_TOLERANCE_SECONDS = 300;

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Stripe ${field} is required`);
  }
  return value.trim();
}

function projectPassProduct(value: unknown): ProjectPassProduct {
  if (value !== "CCTV_DIAGRAM_EXPORT") {
    throw new Error("Unsupported Project Pass product in Stripe metadata");
  }
  return "CCTV_DIAGRAM_EXPORT";
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
  if (!signatureHeader) {
    throw new Error("Stripe signature is required");
  }

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

function verifiedAt(event: StripeEvent, now: () => number) {
  const createdSeconds =
    typeof event.created === "number" && Number.isFinite(event.created)
      ? event.created
      : Math.floor(now() / 1000);
  return new Date(createdSeconds * 1000);
}

function sessionBinding(session: StripeCheckoutSession) {
  const metadata =
    session.metadata && typeof session.metadata === "object"
      ? (session.metadata as Record<string, unknown>)
      : {};
  const organizationId = requiredString(metadata.organizationId, "organization metadata");
  const projectInstallationId = requiredString(metadata.projectInstallationId, "project metadata");
  const product = projectPassProduct(metadata.product);
  const amountCents = Number(requiredString(metadata.amountCents, "amount metadata"));
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new Error("Stripe amount metadata is invalid");
  }
  const currency = requiredString(metadata.currency, "currency metadata").toUpperCase();
  if (session.amount_total !== amountCents) {
    throw new Error("Stripe amount does not match server checkout metadata");
  }
  if (requiredString(session.currency, "currency").toUpperCase() !== currency) {
    throw new Error("Stripe currency does not match server checkout metadata");
  }
  return { organizationId, projectInstallationId, product, amountCents, currency };
}

function normalizeCheckoutEvent(
  event: StripeEvent,
  now: () => number
): VerifiedProviderProjectPassEvent {
  const providerEventId = requiredString(event.id, "event id");
  const eventType = requiredString(event.type, "event type");
  const supported = new Set([
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
  ]);
  if (!supported.has(eventType)) throw new Error("Unsupported Stripe Project Pass event");
  const session = (event.data?.object ?? null) as StripeCheckoutSession | null;
  if (!session || typeof session !== "object") throw new Error("Stripe Checkout Session is required");
  const binding = sessionBinding(session);
  let state: VerifiedProviderProjectPassEvent["state"];
  if (eventType === "checkout.session.completed" || eventType === "checkout.session.async_payment_succeeded") {
    state = session.payment_status === "paid" ? "PAID" : "PENDING";
  } else {
    state = "FAILED";
  }
  return {
    providerEventId,
    providerPaymentId: requiredString(session.id, "Checkout Session id"),
    eventType,
    state,
    ...binding,
    verifiedAt: verifiedAt(event, now),
  };
}

export class StripeProjectPassProvider implements ProjectPassPaymentProvider {
  readonly name = "stripe";

  constructor(
    private readonly config: ProjectPassStripeConfig,
    private readonly fetchImpl: StripeFetch = fetch,
    private readonly now: () => number = Date.now
  ) {}

  async createCheckout(request: ProjectPassCheckoutRequest): Promise<ProjectPassCheckoutSession> {
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", request.successUrl);
    params.set("cancel_url", request.cancelUrl);
    params.set("client_reference_id", request.projectInstallationId);
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", request.currency.toLowerCase());
    params.set("line_items[0][price_data][unit_amount]", String(request.amountCents));
    params.set("line_items[0][price_data][product_data][name]", "NetworkConnectIT Project Pass — CCTV Diagram Export");
    const metadata = {
      organizationId: request.organizationId,
      projectInstallationId: request.projectInstallationId,
      product: request.product,
      amountCents: String(request.amountCents),
      currency: request.currency.toUpperCase(),
    };
    for (const [key, value] of Object.entries(metadata)) {
      params.set(`metadata[${key}]`, value);
      params.set(`payment_intent_data[metadata][${key}]`, value);
    }
    const response = await this.fetchImpl(STRIPE_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.config.secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Stripe Checkout Session creation failed");
    const session = (await response.json()) as StripeCheckoutSession;
    const id = requiredString(session.id, "Checkout Session id");
    const checkoutUrl = requiredString(session.url, "Checkout Session URL");
    if (!checkoutUrl.startsWith("https://checkout.stripe.com/")) throw new Error("Stripe returned an unexpected Checkout URL");
    return { provider: this.name, providerPaymentId: id, checkoutUrl };
  }

  private async normalizeFullRefund(event: StripeEvent): Promise<VerifiedProviderProjectPassEvent> {
    const providerEventId = requiredString(event.id, "event id");
    const eventType = requiredString(event.type, "event type");
    const charge = (event.data?.object ?? null) as StripeCharge | null;
    if (!charge || typeof charge !== "object") throw new Error("Stripe Charge is required");
    if (charge.refunded !== true) throw new Error("Partial Stripe refund does not revoke Project Pass");
    if (typeof charge.amount !== "number" || typeof charge.amount_refunded !== "number" || charge.amount_refunded !== charge.amount) {
      throw new Error("Stripe refund is not a full refund");
    }
    const paymentIntentId = requiredString(charge.payment_intent, "PaymentIntent id");
    const url = `${STRIPE_API}?payment_intent=${encodeURIComponent(paymentIntentId)}&limit=2`;
    const response = await this.fetchImpl(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${this.config.secretKey}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Stripe Checkout Session lookup for refund failed");
    const list = (await response.json()) as StripeCheckoutSessionList;
    if (!Array.isArray(list.data) || list.data.length !== 1) {
      throw new Error("Stripe refund must resolve to exactly one Checkout Session");
    }
    const session = list.data[0] as StripeCheckoutSession;
    if (requiredString(session.payment_intent, "Checkout Session PaymentIntent") !== paymentIntentId) {
      throw new Error("Stripe refund PaymentIntent does not match Checkout Session");
    }
    const binding = sessionBinding(session);
    if (charge.amount !== binding.amountCents) throw new Error("Stripe refund amount does not match Project Pass checkout");
    if (requiredString(charge.currency, "refund currency").toUpperCase() !== binding.currency) {
      throw new Error("Stripe refund currency does not match Project Pass checkout");
    }
    return {
      providerEventId,
      providerPaymentId: requiredString(session.id, "Checkout Session id"),
      eventType,
      state: "REFUNDED",
      ...binding,
      verifiedAt: verifiedAt(event, this.now),
    };
  }

  async verifyWebhook(request: ProjectPassWebhookRequest): Promise<VerifiedProviderProjectPassEvent> {
    verifyStripeSignature(request.rawBody, request.signature, this.config.webhookSecret, this.now());
    let event: StripeEvent;
    try {
      event = JSON.parse(request.rawBody) as StripeEvent;
    } catch {
      throw new Error("Stripe webhook body is invalid JSON");
    }
    const eventType = requiredString(event.type, "event type");
    if (eventType === "charge.refunded") return this.normalizeFullRefund(event);
    return normalizeCheckoutEvent(event, this.now);
  }
}
