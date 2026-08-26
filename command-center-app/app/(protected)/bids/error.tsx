"use client";

import { Button } from "@/components/ui/button";

export default function BidsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-3xl border border-destructive/30 bg-card p-6">
      <h2 className="text-xl font-semibold">Bid workspace could not load</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Contractor OS did not expose the underlying error. Retry the protected workspace request.
      </p>
      <Button className="mt-4" onClick={reset}>Retry</Button>
    </div>
  );
}
