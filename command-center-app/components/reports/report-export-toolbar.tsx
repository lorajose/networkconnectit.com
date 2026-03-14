"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

type ReportExportToolbarProps = {
  backHref: string;
  backLabel: string;
};

export function ReportExportToolbar({
  backHref,
  backLabel
}: ReportExportToolbarProps) {
  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur print:hidden sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">
            Commissioning / Handoff Report
          </p>
          <p className="text-xs text-slate-500">
            Use your browser print dialog and choose “Save as PDF”.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href={backHref}>{backLabel}</Link>
          </Button>
          <Button onClick={() => window.print()}>Print / Save PDF</Button>
        </div>
      </div>
    </div>
  );
}
