import { CheckCircle2, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSubscriptionExperienceSummaryForActor } from "@/lib/contractor-os/subscription-access-repository";

import { startProTrialAction } from "./actions";
import {
  CancelSubscriptionAction,
  SubscriptionPlanAction,
} from "./subscription-controls";

const planFeatures = {
  FREE: [
    "Core contractor workspace",
    "Secure organization access",
    "Standard project workflows",
  ],
  PRO: [
    "Unlimited projects",
    "Premium project outputs",
    "Proposal and closeout exports",
    "Advanced Design Studio",
  ],
  BUSINESS: [
    "Everything in Pro",
    "Team collaboration",
    "DXF workflows",
    "Priority support",
  ],
} as const;

export default async function BillingPage() {
  const user = await requireUser();

  if (!user.organizationId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Select an organization context to review subscription access.
        </CardContent>
      </Card>
    );
  }

  const subscription = await getSubscriptionExperienceSummaryForActor({
    role: user.role,
    organizationId: user.organizationId,
  });
  const persistedSubscription = await prisma.organizationSubscription.findUnique({
    where: { organizationId: user.organizationId },
    select: { status: true },
  });
  const canResubscribe =
    persistedSubscription?.status === "CANCELED" &&
    subscription.source !== "SUBSCRIPTION";

  const trialCopy =
    subscription.source === "TRIAL"
      ? `${subscription.trialDaysRemaining ?? 0} days remaining in your Pro trial.`
      : subscription.source === "EXPIRED_TRIAL"
        ? "Your Pro trial has ended. Your workspace remains available on Free."
        : null;

  const canManageBilling = user.role === "CLIENT_ADMIN";
  const canStartTrial =
    canManageBilling && subscription.source === "NONE";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Billing</Badge>
          <Badge>{subscription.label}</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Plans & billing
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Review your current NetworkConnectIT Contractor OS access.
          Subscription authority is verified on the server before paid
          features are enabled.
        </p>
      </div>

      <Card className="border-sky-400/20">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-primary">
                Current access
              </p>
              <CardTitle className="mt-2">{subscription.label}</CardTitle>
            </div>
            <Badge
              variant={subscription.tier === "FREE" ? "outline" : "default"}
            >
              {subscription.tier}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {canStartTrial ? (
            <form
              action={startProTrialAction}
              className="rounded-2xl border border-sky-400/25 bg-sky-400/5 p-4"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Try Pro free for 30 days
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Unlock premium outputs, closeout exports and Advanced
                    Design Studio. No trial reset is available after the
                    one-time window ends.
                  </p>
                </div>
                <button
                  type="submit"
                  className="shrink-0 rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-200 transition hover:bg-sky-400/15"
                >
                  Start 30-day Pro trial
                </button>
              </div>
            </form>
          ) : null}

          {trialCopy ? (
            <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/40 p-4">
              <Clock3 className="mt-0.5 h-5 w-5 text-sky-300" />
              <div>
                <p className="font-medium">Pro trial</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {trialCopy}
                </p>
              </div>
            </div>
          ) : null}

          {subscription.cancelAtPeriodEnd ? (
            <p className="text-sm text-muted-foreground">
              Your current paid subscription is scheduled to end or change at
              the end of the billing period.
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {planFeatures[subscription.tier].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-sky-300" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {canManageBilling &&
          subscription.source === "SUBSCRIPTION" &&
          !subscription.cancelAtPeriodEnd ? (
            <div className="border-t border-border/70 pt-4">
              <CancelSubscriptionAction />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {(["FREE", "PRO", "BUSINESS"] as const).map((plan) => {
          const current = subscription.tier === plan;
          const trialCurrent =
            current && subscription.source === "TRIAL" && plan === "PRO";
          const canChoosePaidPlan =
            canManageBilling &&
            plan !== "FREE" &&
            (subscription.source !== "SUBSCRIPTION" ||
              subscription.tier !== plan);

          return (
            <Card
              key={plan}
              className={
                current ? "border-sky-400/30" : "border-border/80"
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>
                    {plan === "FREE"
                      ? "Free"
                      : plan === "PRO"
                        ? "Pro"
                        : "Business"}
                  </CardTitle>
                  {current ? (
                    <Badge>{trialCurrent ? "Trial" : "Current"}</Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {planFeatures[plan].map((feature) => (
                    <p
                      key={feature}
                      className="flex gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      {feature}
                    </p>
                  ))}
                </div>

                {canChoosePaidPlan ? (
                  <SubscriptionPlanAction
                    plan={plan}
                    source={subscription.source}
                    currentTier={subscription.tier}
                    resubscribe={canResubscribe}
                    disabled={subscription.cancelAtPeriodEnd}
                  />
                ) : null}

                {plan === "FREE" &&
                subscription.source === "SUBSCRIPTION" ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    To return to Free, schedule cancellation from the current
                    access section. Paid access remains active through the end
                    of the current billing period.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
