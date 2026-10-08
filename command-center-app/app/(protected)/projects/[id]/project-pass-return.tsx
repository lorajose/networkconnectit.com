"use client";

import { useEffect, useState } from "react";

import { getProjectPassReturnState } from "@/lib/contractor-os/project-pass-return-status";
import type { ProjectPassProduct } from "@/lib/contractor-os/project-pass";

type AccessState = "idle" | "checking" | "authorized" | "not-authorized" | "error";

type ProjectPassReturnProps = {
  status: string | null | undefined;
  organizationId: string;
  projectInstallationId: string;
  product: ProjectPassProduct;
};

export function ProjectPassReturn({
  status,
  organizationId,
  projectInstallationId,
  product,
}: ProjectPassReturnProps) {
  const returnState = getProjectPassReturnState(status);
  const [accessState, setAccessState] = useState<AccessState>(
    returnState.shouldCheckServerEntitlement ? "checking" : "idle"
  );

  useEffect(() => {
    if (!returnState.shouldCheckServerEntitlement) return;

    const controller = new AbortController();
    const query = new URLSearchParams({
      organizationId,
      projectInstallationId,
      product,
    });

    void fetch(`/api/project-pass/access?${query.toString()}`, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.ok) {
          const body = (await response.json()) as { authorized?: boolean };
          setAccessState(body.authorized === true ? "authorized" : "not-authorized");
          return;
        }
        setAccessState(response.status === 403 ? "not-authorized" : "error");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAccessState("error");
      });

    return () => controller.abort();
  }, [organizationId, product, projectInstallationId, returnState.shouldCheckServerEntitlement]);

  if (returnState.status === "cancelled") {
    return (
      <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4 text-sm">
        <p className="font-medium">Project Pass checkout cancelled</p>
        <p className="mt-1 text-muted-foreground">No premium access was granted by the browser return.</p>
      </div>
    );
  }

  if (returnState.status === "failed") {
    return (
      <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4 text-sm">
        <p className="font-medium">Project Pass payment not completed</p>
        <p className="mt-1 text-muted-foreground">No premium access was granted. You can retry checkout when ready.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4 text-sm">
      <p className="font-medium">
        {accessState === "authorized"
          ? "Project Pass active"
          : accessState === "checking"
            ? "Verifying Project Pass access…"
            : accessState === "not-authorized"
              ? "Payment returned — verification pending"
              : "Unable to verify Project Pass access"}
      </p>
      <p className="mt-1 text-muted-foreground">
        {accessState === "authorized"
          ? "Server-verified entitlement is active for this project."
          : accessState === "not-authorized"
            ? "The browser return does not unlock premium output. Access activates only after the server records a verified payment event."
            : accessState === "error"
              ? "Premium output remains locked until server verification succeeds."
              : "Checking the persisted server entitlement. The checkout return itself cannot unlock premium output."}
      </p>
    </div>
  );
}
