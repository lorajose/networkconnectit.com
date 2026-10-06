export type ProjectPassStripeConfig = {
  secretKey: string;
  webhookSecret: string;
};

export type ProjectPassStripeConfigResolution =
  | { configured: true; config: ProjectPassStripeConfig }
  | { configured: false; reason: "STRIPE_NOT_CONFIGURED" };

/**
 * Server-only Stripe configuration for Project Pass.
 *
 * Secrets are intentionally read only from process.env and must never be
 * exposed to the browser or committed to source control. The provider remains
 * fail-closed until both the API key and webhook signing secret are present.
 */
export function resolveProjectPassStripeConfig(
  env: NodeJS.ProcessEnv = process.env
): ProjectPassStripeConfigResolution {
  const secretKey = env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = env.STRIPE_PROJECT_PASS_WEBHOOK_SECRET?.trim();

  if (!secretKey || !webhookSecret) {
    return {
      configured: false,
      reason: "STRIPE_NOT_CONFIGURED",
    };
  }

  return {
    configured: true,
    config: {
      secretKey,
      webhookSecret,
    },
  };
}
