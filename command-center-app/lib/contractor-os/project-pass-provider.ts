import type {
  ProjectPassPaymentState,
  ProjectPassProduct,
} from "./project-pass";
import type { VerifiedProjectPassEvent } from "./project-pass-repository";

export type ProjectPassCheckoutRequest = {
  organizationId: string;
  projectInstallationId: string;
  product: ProjectPassProduct;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
};

export type ProjectPassCheckoutSession = {
  provider: string;
  providerPaymentId: string;
  checkoutUrl: string;
};

export type ProjectPassWebhookRequest = {
  rawBody: string;
  signature: string | null;
  headers: Readonly<Record<string, string | undefined>>;
};

export type VerifiedProviderProjectPassEvent = {
  providerEventId: string;
  providerPaymentId: string;
  eventType: string;
  state: ProjectPassPaymentState;
  organizationId: string;
  projectInstallationId: string;
  product: ProjectPassProduct;
  amountCents: number;
  currency: string;
  verifiedAt: Date;
};

/**
 * Provider-neutral payment boundary for NCI-016.
 *
 * Implementations may use Stripe, another processor, or a test adapter, but
 * they must keep provider SDK objects outside the Contractor OS domain.
 * Checkout completion in the browser is informational only. The only input
 * that may become payment authority is a webhook/event whose authenticity has
 * been verified by the provider adapter.
 */
export interface ProjectPassPaymentProvider {
  readonly name: string;

  createCheckout(
    request: ProjectPassCheckoutRequest
  ): Promise<ProjectPassCheckoutSession>;

  verifyWebhook(
    request: ProjectPassWebhookRequest
  ): Promise<VerifiedProviderProjectPassEvent>;
}

export function toVerifiedProjectPassEvent(
  provider: ProjectPassPaymentProvider,
  event: VerifiedProviderProjectPassEvent
): VerifiedProjectPassEvent {
  if (!provider.name.trim()) {
    throw new Error("Project Pass provider name is required");
  }

  return {
    organizationId: event.organizationId,
    projectInstallationId: event.projectInstallationId,
    product: event.product,
    provider: provider.name.trim(),
    providerEventId: event.providerEventId,
    providerPaymentId: event.providerPaymentId,
    eventType: event.eventType,
    state: event.state,
    amountCents: event.amountCents,
    currency: event.currency,
    verifiedAt: event.verifiedAt,
  };
}
