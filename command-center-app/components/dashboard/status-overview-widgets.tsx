import { Card, CardContent } from "@/components/ui/card";
import type { StatusOverviewItem } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

const toneMap = {
  healthy: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-200",
  critical: "border-rose-500/20 bg-rose-500/10 text-rose-200",
  unknown: "border-slate-500/20 bg-slate-500/10 text-slate-200",
  info: "border-sky-500/20 bg-sky-500/10 text-sky-200"
} as const;

type StatusOverviewWidgetsProps = {
  items: readonly StatusOverviewItem[];
};

export function StatusOverviewWidgets({
  items
}: StatusOverviewWidgetsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <Card
          key={item.id}
          className={cn("border shadow-none", toneMap[item.tone])}
        >
          <CardContent className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.16em] text-current/70">
                {item.label}
              </p>
              <span className="h-2.5 w-2.5 rounded-full bg-current/80" />
            </div>
            <p className="text-2xl font-semibold tracking-tight text-current">
              {item.value}
            </p>
            <p className="text-xs leading-5 text-current/80">{item.helper}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
