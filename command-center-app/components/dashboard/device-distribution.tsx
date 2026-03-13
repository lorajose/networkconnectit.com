import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { EmptyState } from "@/components/dashboard/empty-state";
import type { DeviceDistributionItem, FilterToken, MetricTone } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";
import { FilterRowPlaceholder } from "@/components/dashboard/filter-row-placeholder";

const barToneMap: Record<MetricTone, string> = {
  neutral: "bg-slate-400",
  cyan: "bg-sky-400",
  healthy: "bg-emerald-400",
  warning: "bg-amber-400",
  critical: "bg-rose-400"
};

type DeviceDistributionProps = {
  title: string;
  description: string;
  items: readonly DeviceDistributionItem[];
  filters: readonly FilterToken[];
};

export function DeviceDistribution({
  title,
  description,
  items,
  filters
}: DeviceDistributionProps) {
  return (
    <DashboardSection
      title={title}
      description={description}
      action={<FilterRowPlaceholder filters={filters} label="Distribution filters" />}
      contentClassName="p-5"
    >
      {items.length === 0 ? (
        <EmptyState
          title="No distribution data"
          description="Device type breakdowns will appear here once a data source is connected."
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-border/70 bg-background/45 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.count.toLocaleString()} monitored devices
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">
                    {item.share}%
                  </p>
                  <p className="text-xs text-muted-foreground">of visible estate</p>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-accent">
                <div
                  className={cn("h-2 rounded-full", barToneMap[item.tone])}
                  style={{ width: `${item.share}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardSection>
  );
}
