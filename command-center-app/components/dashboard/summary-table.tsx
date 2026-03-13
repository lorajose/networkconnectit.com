import type { ReactNode } from "react";

import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { EmptyState } from "@/components/dashboard/empty-state";
import { cn } from "@/lib/utils";

type SummaryTableProps = {
  title: string;
  description: string;
  headers: string[];
  children: ReactNode;
  rowCount: number;
  toolbar?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
};

export function SummaryTable({
  title,
  description,
  headers,
  children,
  rowCount,
  toolbar,
  emptyTitle = "No summary data available",
  emptyDescription = "This section is ready for live data once aggregation queries are wired in.",
  className
}: SummaryTableProps) {
  return (
    <DashboardSection
      title={title}
      description={description}
      action={toolbar}
      className={className}
    >
      {rowCount === 0 ? (
        <div className="p-6">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-background/40 text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {headers.map((header) => (
                  <th key={header} className="px-4 py-3 font-medium sm:px-5">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={cn("divide-y divide-border/60 text-sm")}>{children}</tbody>
          </table>
        </div>
      )}
    </DashboardSection>
  );
}
