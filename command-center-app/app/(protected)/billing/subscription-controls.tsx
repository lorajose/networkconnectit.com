"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type Plan = "PRO" | "BUSINESS";
type Source = "NONE" | "EXPIRED_TRIAL" | "TRIAL" | "SUBSCRIPTION";

function appPath(path: string) {
  const configured = process.env.NEXT_PUBLIC_APP_BASE_PATH?.trim() ?? "";
  const basePath =
    configured && configured !== "/"
      ? `/${configured.replace(/^\/+|\/+$/g, "")}`
      : "";
  return `${basePath}${path}`;
}

async function responseMessage(response: Response) {
  try {
    const payload = (await response.json()) as { error?: unknown };
    return typeof payload.error === "string" && payload.error.trim()
      ? payload.error
      : null;
  } catch {
    return null;
  }
}

export function SubscriptionPlanAction({
  plan,
  source,
  currentTier,
  resubscribe = false,
  disabled = false,
}: {
  plan: Plan;
  source: Source;
  currentTier: "FREE" | Plan;
  resubscribe?: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isPaid = source === "SUBSCRIPTION";
  const isUpgrade = isPaid && currentTier === "PRO" && plan === "BUSINESS";
  const isDowngrade =
    isPaid && currentTier === "BUSINESS" && plan === "PRO";

  async function submit() {
    setPending(true);
    setMessage(null);

    try {
      if (!isPaid) {
        const response = await fetch(appPath("/api/subscriptions/checkout"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });

        if (!response.ok) {
          throw new Error(
            (await responseMessage(response)) ?? "Unable to start checkout."
          );
        }

        const payload = (await response.json()) as { checkoutUrl?: unknown };
        if (
          typeof payload.checkoutUrl !== "string" ||
          !payload.checkoutUrl.startsWith("https://checkout.stripe.com/")
        ) {
          throw new Error("Billing provider returned an invalid checkout URL.");
        }

        window.location.assign(payload.checkoutUrl);
        return;
      }

      const response = await fetch(appPath("/api/subscriptions/change"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        throw new Error(
          (await responseMessage(response)) ?? "Unable to update subscription."
        );
      }

      setMessage(
        isDowngrade
          ? "Downgrade scheduled for the end of the current billing period."
          : isUpgrade
            ? "Upgrade submitted. Access updates after Stripe webhook confirmation."
            : "Subscription change submitted."
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update subscription."
      );
    } finally {
      setPending(false);
    }
  }

  const label = !isPaid
    ? resubscribe
      ? `Subscribe again to ${plan === "PRO" ? "Pro" : "Business"}`
      : `Choose ${plan === "PRO" ? "Pro" : "Business"}`
    : isUpgrade
      ? "Upgrade to Business"
      : isDowngrade
        ? "Downgrade to Pro at period end"
        : "Change plan";

  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="w-full"
        variant={isDowngrade ? "outline" : "default"}
        disabled={disabled || pending}
        onClick={submit}
      >
        {pending ? "Processing..." : label}
      </Button>
      {message ? (
        <p className="text-xs leading-5 text-muted-foreground" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function CancelSubscriptionAction({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function cancel() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch(appPath("/api/subscriptions/change"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: null }),
      });

      if (!response.ok) {
        throw new Error(
          (await responseMessage(response)) ??
            "Unable to schedule cancellation."
        );
      }

      setMessage(
        "Cancellation scheduled. Paid access remains available through the current billing period."
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to schedule cancellation."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={disabled || pending}
        onClick={cancel}
      >
        {pending ? "Processing..." : "Cancel at period end"}
      </Button>
      {message ? (
        <p className="text-xs leading-5 text-muted-foreground" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  );
}
