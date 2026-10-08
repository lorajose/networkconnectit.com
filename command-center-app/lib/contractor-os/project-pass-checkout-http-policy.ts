import { PROJECT_PASS_PRODUCTS, type ProjectPassProduct } from "./project-pass";

export type ProjectPassCheckoutHttpInput = {
  organizationId?: unknown;
  projectInstallationId?: unknown;
  product?: unknown;
};

export type ProjectPassCheckoutHttpValidation =
  | {
      ok: true;
      input: {
        organizationId: string;
        projectInstallationId: string;
        product: ProjectPassProduct;
      };
    }
  | {
      ok: false;
      status: 400;
      message: "Valid organization, projectInstallationId and product are required.";
    };

function isProjectPassProduct(value: unknown): value is ProjectPassProduct {
  return typeof value === "string" && PROJECT_PASS_PRODUCTS.includes(value as ProjectPassProduct);
}

/**
 * Dependency-light HTTP input policy for Project Pass checkout.
 *
 * The authenticated organization is the fallback tenant. The browser cannot
 * supply price, currency, return URLs, payment state or entitlement state here.
 */
export function validateProjectPassCheckoutHttpInput(
  body: ProjectPassCheckoutHttpInput,
  authenticatedOrganizationId: string | null | undefined
): ProjectPassCheckoutHttpValidation {
  const organizationId =
    typeof body.organizationId === "string" && body.organizationId.trim()
      ? body.organizationId.trim()
      : authenticatedOrganizationId?.trim() || "";
  const projectInstallationId =
    typeof body.projectInstallationId === "string" ? body.projectInstallationId.trim() : "";
  const product = body.product;

  if (!organizationId || !projectInstallationId || !isProjectPassProduct(product)) {
    return {
      ok: false,
      status: 400,
      message: "Valid organization, projectInstallationId and product are required.",
    };
  }

  return {
    ok: true,
    input: { organizationId, projectInstallationId, product },
  };
}
