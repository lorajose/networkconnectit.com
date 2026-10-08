"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ProjectPassProduct } from "@/lib/contractor-os/project-pass";

type ProjectPassPurchaseButtonProps = {
  organizationId: string;
  projectInstallationId: string;
  product: ProjectPassProduct;
};

type CheckoutResponse = {
  ok?: boolean;
  checkoutUrl?: string;
  code?: string;
  error?: string;
};

export function ProjectPassPurchaseButton({
  organizationId,
  projectInstallationId,
  product
}: ProjectPassPurchaseButtonProps) {
  const [state, setState] = useState<"idle" | "starting" | "unavailable" | "error">("idle");
  const [message, setMessage] = useState("");

  async function startCheckout() {
    setState("starting");
    setMessage("");

    try {
      const response = await fetch("/api/project-pass/checkout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          organizationId,
          projectInstallationId,
          product
        })
      });

      const payload = (await response.json().catch(() => ({}))) as CheckoutResponse;

      if (
        response.ok &&
        payload.ok === true &&
        typeof payload.checkoutUrl === "string" &&
        payload.checkoutUrl
      ) {
        window.location.assign(payload.checkoutUrl);
        return;
      }

      if (response.status === 503 && payload.code === "PROVIDER_NOT_CONFIGURED") {
        setState("unavailable");
        setMessage(
          "Project Pass checkout is not configured yet. Premium access remains locked."
        );
        return;
      }

      setState("error");
      setMessage(payload.error || "Unable to start Project Pass checkout.");
    } catch {
      setState("error");
      setMessage("Unable to start Project Pass checkout.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" onClick={startCheckout} disabled={state === "starting"}>
        {state === "starting" ? "Starting secure checkout..." : "Get Project Pass"}
      </Button>
      {message ? (
        <p
          className={
            state === "unavailable"
              ? "max-w-sm text-xs text-muted-foreground"
              : "max-w-sm text-xs text-destructive"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
