import type { ProjectPassProduct } from "./project-pass";

export type ProjectPassCatalogEntry = {
  product: ProjectPassProduct;
  amountCents: number;
  currency: "USD";
};

/**
 * Server-owned Project Pass commercial terms.
 *
 * Client requests select a product; they never supply authoritative price or
 * currency. Keep willingness-to-pay experiments explicit here until NCI-017
 * introduces subscription/package pricing.
 */
const PROJECT_PASS_CATALOG: Readonly<Record<ProjectPassProduct, ProjectPassCatalogEntry>> = {
  CCTV_DIAGRAM_EXPORT: {
    product: "CCTV_DIAGRAM_EXPORT",
    amountCents: 1900,
    currency: "USD",
  },
};

export function getProjectPassCatalogEntry(product: ProjectPassProduct): ProjectPassCatalogEntry {
  const entry = PROJECT_PASS_CATALOG[product];
  if (!entry) {
    throw new Error("Unsupported Project Pass product");
  }

  return entry;
}
