import type { ProjectPassPaymentProvider } from "./project-pass-provider";

export type ProjectPassProviderResolution =
  | { configured: true; provider: ProjectPassPaymentProvider }
  | { configured: false; reason: "PROVIDER_NOT_CONFIGURED" };

/**
 * Provider selection is deliberately centralized and fail-closed.
 *
 * NCI-016 does not silently introduce a payment vendor or credentials. When a
 * provider adapter is explicitly selected and configured, register it here.
 * Until then, checkout routes can expose a safe "not configured" state without
 * fabricating a checkout URL or weakening the server-verified entitlement
 * boundary.
 */
export function resolveProjectPassPaymentProvider(): ProjectPassProviderResolution {
  return {
    configured: false,
    reason: "PROVIDER_NOT_CONFIGURED",
  };
}
