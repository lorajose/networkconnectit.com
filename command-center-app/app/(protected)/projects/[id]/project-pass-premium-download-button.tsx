"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ProjectPassProduct } from "@/lib/contractor-os/project-pass";

type ProjectPassPremiumDownloadButtonProps = {
  organizationId: string;
  projectInstallationId: string;
  product: ProjectPassProduct;
};

function filenameFromDisposition(value: string | null) {
  const match = value?.match(/filename="([^"]+)"/i);
  return match?.[1] || "networkconnectit-cctv-diagram.svg";
}

/**
 * The browser requests an artifact; it never asserts entitlement or supplies
 * artifact markup. The premium-output route re-checks the authenticated,
 * server-verified Project Pass before generating the SVG.
 */
export function ProjectPassPremiumDownloadButton({
  organizationId,
  projectInstallationId,
  product,
}: ProjectPassPremiumDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function download() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/project-pass/premium-output", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          projectInstallationId,
          product,
        }),
      });

      if (!response.ok) {
        setMessage(
          response.status === 403
            ? "Project Pass is not active for this premium output."
            : "Premium output could not be generated. Please try again."
        );
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filenameFromDisposition(response.headers.get("content-disposition"));
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setMessage("Premium CCTV diagram generated securely.");
    } catch {
      setMessage("Premium output could not be generated. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={download} disabled={loading}>
        {loading ? "Generating secure diagram…" : "Download premium CCTV diagram"}
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
