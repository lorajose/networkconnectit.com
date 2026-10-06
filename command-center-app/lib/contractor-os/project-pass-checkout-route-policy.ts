import type { ProjectPassProduct } from "./project-pass";

export type ProjectPassCheckoutRouteInput = {
  organizationId: string;
  projectInstallationId: string;
  product: ProjectPassProduct;
};

export type ProjectPassCheckoutProviderState =
  | { configured: true }
  | { configured: false; reason: "PROVIDER_NOT_CONFIGURED" };

export type ProjectPassCheckoutRouteDecision =
  | { allowed: true; input: ProjectPassCheckoutRouteInput }
  | {
      allowed: false;
      status: 503;
      code: "PROVIDER_NOT_CONFIGURED";
      message: "Project Pass checkout is not configured yet.";
    };

/**
 * Pure route policy used before any payment-provider invocation.
 *
 * This decision is intentionally dependency-light so the fail-closed behavior
 * can be regression-tested without loading database or provider SDK code.
 */
export function decideProjectPassCheckoutRoute(
  input: ProjectPassCheckoutRouteInput,
  providerState: ProjectPassCheckoutProviderState
): ProjectPassCheckoutRouteDecision {
  if (!providerState.configured) {
    return {
      allowed: false,
      status: 503,
      code: providerState.reason,
      message: "Project Pass checkout is not configured yet.",
    };
  }

  return { allowed: true, input };
}
