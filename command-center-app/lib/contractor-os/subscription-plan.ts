export const SUBSCRIPTION_PLANS = ["PRO", "BUSINESS"] as const;

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const SUBSCRIPTION_FEATURES = [
  "UNLIMITED_PROJECTS",
  "PREMIUM_PROJECT_OUTPUTS",
  "PROPOSAL_AND_CLOSEOUT_EXPORTS",
  "TEAM_COLLABORATION",
  "ADVANCED_DESIGN_STUDIO",
  "DXF_WORKFLOWS",
  "PRIORITY_SUPPORT",
] as const;

export type SubscriptionFeature = (typeof SUBSCRIPTION_FEATURES)[number];

export type SubscriptionPlanDefinition = {
  plan: SubscriptionPlan;
  label: string;
  description: string;
  features: readonly SubscriptionFeature[];
};

/**
 * Server-owned NCI-017 plan entitlement matrix.
 *
 * Pricing is intentionally not embedded here. Stripe price identifiers and
 * commercial experiments belong to server configuration so browser state can
 * never become billing or entitlement authority.
 */
const SUBSCRIPTION_PLAN_CATALOG: Readonly<
  Record<SubscriptionPlan, SubscriptionPlanDefinition>
> = {
  PRO: {
    plan: "PRO",
    label: "Pro",
    description:
      "For independent contractors and small teams running recurring low-voltage projects.",
    features: [
      "UNLIMITED_PROJECTS",
      "PREMIUM_PROJECT_OUTPUTS",
      "PROPOSAL_AND_CLOSEOUT_EXPORTS",
      "ADVANCED_DESIGN_STUDIO",
    ],
  },
  BUSINESS: {
    plan: "BUSINESS",
    label: "Business",
    description:
      "For contractor organizations that need team workflows and advanced project delivery capabilities.",
    features: [
      "UNLIMITED_PROJECTS",
      "PREMIUM_PROJECT_OUTPUTS",
      "PROPOSAL_AND_CLOSEOUT_EXPORTS",
      "TEAM_COLLABORATION",
      "ADVANCED_DESIGN_STUDIO",
      "DXF_WORKFLOWS",
      "PRIORITY_SUPPORT",
    ],
  },
};

export function getSubscriptionPlanDefinition(
  plan: SubscriptionPlan
): SubscriptionPlanDefinition {
  const definition = SUBSCRIPTION_PLAN_CATALOG[plan];

  if (!definition) {
    throw new Error("Unsupported subscription plan");
  }

  return definition;
}

export function subscriptionPlanHasFeature(
  plan: SubscriptionPlan,
  feature: SubscriptionFeature
) {
  return getSubscriptionPlanDefinition(plan).features.includes(feature);
}

export function isSubscriptionPlan(value: string): value is SubscriptionPlan {
  return SUBSCRIPTION_PLANS.includes(value as SubscriptionPlan);
}
