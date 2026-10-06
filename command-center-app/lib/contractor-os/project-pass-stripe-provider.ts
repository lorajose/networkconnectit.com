import { createHmac, timingSafeEqual } from "node:crypto";

import type {
  ProjectPassCheckoutRequest,
  ProjectPassCheckoutSession,
  ProjectPassPaymentProvider,
  ProjectPassWebhookRequest,
  VerifiedProviderProjectPassEvent,
} from "./project-pass-provider";
import type { ProjectPassStripeConfig } from "./project-pass-stripe-config";

type StripeFetch = (input: string, init?: RequestInit) => Promise<Response>;

type StripeCheckoutSession = {
  id?: unknown;
  url?: unknown;
  amount_total?: unknown;
  currency?: unknown;
  payment_status?: unknown;
  metadata?: unknown;
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

function projectPassProduct(value: unknown) {
  if (value !== "CCTV_DIAGRAM_EXPORT") {
    throw new Error("Unsupported Project Pass product in Stripe metadata");
  }
  return value;
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

function normalizeStripeEvent(
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
  if (!supported.has(eventType)) {
    throw new Error("Unsupported Stripe Project Pass event");
  }

  const session = (event.data?.object ?? null) as StripeCheckoutSession | null;
  if (!session || typeof session !== "object") {
    throw new Error("Stripe Checkout Session is required");
  }

  const metadata =
    session.metadata && typeof session.metadata === "object"
      ? (session.metadata as Record<string, unknown>)
      : {};

  const organizationId = requiredString(metadata.organizationId, "organization metadata");
  const projectInstallationId = requiredString(
    metadata.projectInstallationId,
    "project metadata"
  );
  const product = projectPassProduct(metadata.product);
  const metadataAmount = Number(requiredString(metadata.amountCents, "amount metadata"));
  if (!Number.isSafeInteger(metadataAmount) || metadataAmount <= 0) {
    throw new Error("Stripe amount metadata is invalid");
  }

  const metadataCurrency = requiredString(metadata.currency, "currency metadata").toUpperCase();
  const amountTotal = session.amount_total;
  if (typeof amountTotal !== "number" || amountTotal !== metadataAmount) {
    throw new Error("Stripe amount does not match server checkout metadata");
  }

  const sessionCurrency = requiredString(session.currency, "currency").toUpperCase();
  if (sessionCurrency !== metadataCurrency) {
    throw new Error("Stripe currency does not match server checkout metadata");
  }

  let state: VerifiedProviderProjectPassEvent["state"];
  if (
    eventType === "checkout.session.completed" ||
    eventType === "checkout.session.async_payment_succeeded"
  ) {
    state = session.payment_status === "paid" ? "PAID" : "PENDING";
  } else {
    state = "FAILED";
  }

  const createdSeconds =
    typeof event.created === "number" && Number.isFinite(event.created)
      ? event.created
      : Math.floor(now() / 1000);

  return {
    providerEventId,
    providerPaymentId: requiredString(session.id, "Checkout Session id"),
    eventType,
    state,
    organizationId,
    projectInstallationId,
    product,
    amountCents: metadataAmount,
    currency: metadataCurrency,
    verifiedAt: new Date(createdSeconds * 1000),
  };
}

export class StripeProjectPassProvider implements ProjectPassPaymentProvider {
  readonly name = "stripe";

  constructor(
    private readonly config: ProjectPassStripeConfig,
    private readonly fetchImpl: StripeFetch = fetch,
    private readonly now: () => number = Date.now
  ) {}

  async createCheckout(
    request: ProjectPassCheckoutRequest
  ): Promise<ProjectPassCheckoutSession> {
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", request.successUrl);
    params.set("cancel_url", request.cancelUrl);
    params.set("client_reference_id", request.projectInstallationId);
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", request.currency.toLowerCase());
    params.set(
      "line_items[0][price_data][unit_amount]",
      String(request.amountCents)
    );
    params.set(
      "line_items[0][price_data][product_data][name]",
      "NetworkConnectIT Project Pass — CCTV Diagram Export"
    );

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
      headers: {
        Authorization: `Bearer ${this.config.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Stripe Checkout Session creation failed");
    }

    const session = (await response.json()) as StripeCheckoutSession;
    const id = requiredString(session.id, "Checkout Session id");
    const checkoutUrl = requiredString(session.url, "Checkout Session URL");

    if (!checkoutUrl.startsWith("https://checkout.stripe.com/")) {
      throw new Error("Stripe returned an unexpected Checkout URL");
    }

    return {
      provider: this.name,
      providerPaymentId: id,
      checkoutUrl,
    };
  }

  async verifyWebhook(
    request: ProjectPassWebhookRequest
  ): Promise<VerifiedProviderProjectPassEvent> {
    verifyStripeSignature(
      request.rawBody,
      request.signature,
      this.config.webhookSecret,
      this.now()
    );

    let event: StripeEvent;
    try {
      event = JSON.parse(request.rawBody) as StripeEvent;
    } catch {
      throw new Error("Stripe webhook body is invalid JSON");
    }

    return normalizeStripeEvent(event, this.now);
  }
}
