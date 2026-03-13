import Link from "next/link";

import { Button } from "@/components/ui/button";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  prevHref?: string;
  nextHref?: string;
};

export function PaginationControls({
  page,
  totalPages,
  totalCount,
  pageSize,
  prevHref,
  nextHref
}: PaginationControlsProps) {
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-card/70 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p>
        Showing <span className="text-foreground">{from}</span>-
        <span className="text-foreground">{to}</span> of{" "}
        <span className="text-foreground">{totalCount}</span> records
      </p>
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" asChild disabled={!prevHref}>
          {prevHref ? <Link href={prevHref}>Previous</Link> : <span>Previous</span>}
        </Button>
        <Button variant="outline" size="sm" asChild disabled={!nextHref}>
          {nextHref ? <Link href={nextHref}>Next</Link> : <span>Next</span>}
        </Button>
      </div>
    </div>
  );
}
