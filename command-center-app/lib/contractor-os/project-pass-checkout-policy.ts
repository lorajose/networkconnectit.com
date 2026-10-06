import { getProjectPassCatalogEntry } from "./project-pass-catalog";
import type { ProjectPassProduct } from "./project-pass";

export type ProjectPassCheckoutIntent = {
  organizationId: string;
  projectInstallationId: string;
  product: ProjectPassProduct;
  successUrl: string;
  cancelUrl: string;
};

export type ProjectPassCheckoutPolicyOptions = {
  trustedOrigins: ReadonlySet<string>;
};

/**
 * Deliberately structural and dependency-light so checkout policy security
 * tests do not pull persistence/webhook modules into the isolated test build.
 */
export type ProjectPassCheckoutTerms = {
  organizationId: string;
  projectInstallationId: string;
  product: ProjectPassProduct;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
};

function required(value: string, name: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

export function requireTrustedProjectPassReturnUrl(
  value: string,
  name: string,
  trustedOrigins: ReadonlySet<string>
) {
  const normalized = required(value, name);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${name} must use http or https`);
  }
  if (!trustedOrigins.has(parsed.origin)) {
    throw new Error(`${name} origin is not allowed for Project Pass checkout`);
  }

  return parsed.toString();
}

/**
 * Converts a caller-controlled checkout intent into provider terms.
 * Commercial price/currency always come from the server catalog; the caller
 * can select a product but cannot inject or override provider pricing.
 */
export function buildProjectPassCheckoutRequest(
  intent: ProjectPassCheckoutIntent,
  options: ProjectPassCheckoutPolicyOptions
): ProjectPassCheckoutTerms {
  const organizationId = required(intent.organizationId, "organizationId");
  const projectInstallationId = required(
    intent.projectInstallationId,
    "projectInstallationId"
  );
  const catalogEntry = getProjectPassCatalogEntry(intent.product);

  return {
    organizationId,
    projectInstallationId,
    product: catalogEntry.product,
    amountCents: catalogEntry.amountCents,
    currency: catalogEntry.currency,
    successUrl: requireTrustedProjectPassReturnUrl(
      intent.successUrl,
      "successUrl",
      options.trustedOrigins
    ),
    cancelUrl: requireTrustedProjectPassReturnUrl(
      intent.cancelUrl,
      "cancelUrl",
      options.trustedOrigins
    ),
  };
}
