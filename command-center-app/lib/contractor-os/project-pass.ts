export const PROJECT_PASS_PRODUCTS = ["CCTV_DIAGRAM_EXPORT"] as const;

export type ProjectPassProduct = (typeof PROJECT_PASS_PRODUCTS)[number];

export const PROJECT_PASS_PAYMENT_STATES = [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED"
] as const;

export type ProjectPassPaymentState =
  (typeof PROJECT_PASS_PAYMENT_STATES)[number];

export type ProjectPassPaymentRecord = {
  id: string;
  organizationId: string;
  projectInstallationId: string;
  product: ProjectPassProduct;
  provider: string;
  providerPaymentId: string;
  state: ProjectPassPaymentState;
  amountCents: number;
  currency: string;
  verifiedAt: string | null;
};

export type ProjectPassEntitlement = {
  organizationId: string;
  projectInstallationId: string;
  product: ProjectPassProduct;
  paymentId: string;
  grantedAt: string;
  revokedAt: string | null;
};

export function normalizeProjectPassCurrency(value: string) {
  const currency = value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Project Pass currency must be a three-letter ISO currency code.");
  }

  return currency;
}

export function validateProjectPassPayment(
  payment: ProjectPassPaymentRecord
): ProjectPassPaymentRecord {
  if (!payment.id.trim()) throw new Error("Project Pass payment id is required.");
  if (!payment.organizationId.trim()) throw new Error("Project Pass organization is required.");
  if (!payment.projectInstallationId.trim()) throw new Error("Project Pass project is required.");
  if (!PROJECT_PASS_PRODUCTS.includes(payment.product)) {
    throw new Error("Unsupported Project Pass product.");
  }
  if (!payment.provider.trim()) throw new Error("Project Pass payment provider is required.");
  if (!payment.providerPaymentId.trim()) {
    throw new Error("Project Pass provider payment id is required.");
  }
  if (!Number.isSafeInteger(payment.amountCents) || payment.amountCents < 0) {
    throw new Error("Project Pass amount must be a non-negative integer in cents.");
  }

  const verifiedAt =
    payment.verifiedAt === null ? null : new Date(payment.verifiedAt);

  if (verifiedAt && Number.isNaN(verifiedAt.getTime())) {
    throw new Error("Project Pass verified timestamp is invalid.");
  }

  return {
    ...payment,
    currency: normalizeProjectPassCurrency(payment.currency)
  };
}

export function deriveProjectPassEntitlement(
  paymentInput: ProjectPassPaymentRecord
): ProjectPassEntitlement | null {
  const payment = validateProjectPassPayment(paymentInput);

  // Browser return parameters, sessionStorage, and client callbacks are never
  // accepted here. Only a server-persisted PAID payment with a trusted
  // verification timestamp may grant access.
  if (payment.state !== "PAID" || !payment.verifiedAt) {
    return null;
  }

  return {
    organizationId: payment.organizationId,
    projectInstallationId: payment.projectInstallationId,
    product: payment.product,
    paymentId: payment.id,
    grantedAt: payment.verifiedAt,
    revokedAt: null
  };
}

export function hasProjectPassEntitlement(
  entitlement: ProjectPassEntitlement | null,
  input: {
    organizationId: string;
    projectInstallationId: string;
    product: ProjectPassProduct;
  }
) {
  return Boolean(
    entitlement &&
      !entitlement.revokedAt &&
      entitlement.organizationId === input.organizationId &&
      entitlement.projectInstallationId === input.projectInstallationId &&
      entitlement.product === input.product
  );
}
