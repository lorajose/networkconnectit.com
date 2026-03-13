import {
  Activity,
  BellRing,
  Building2,
  Cpu,
  MapPinned,
  Wifi,
  WifiOff
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import type { DashboardMetric, MetricIconKey, MetricTone } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

const iconMap: Record<MetricIconKey, typeof Building2> = {
  organizations: Building2,
  organization: Building2,
  sites: MapPinned,
  devices: Cpu,
  online: Wifi,
  offline: WifiOff,
  alerts: BellRing
};

const toneMap: Record<MetricTone, string> = {
  neutral:
    "border-border/70 bg-slate-950/40 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
  cyan:
    "border-sky-400/20 bg-sky-400/10 text-sky-100 shadow-[0_18px_30px_rgba(14,165,233,0.12)]",
  healthy:
    "border-emerald-400/20 bg-emerald-400/10 text-emerald-100 shadow-[0_18px_30px_rgba(16,185,129,0.12)]",
  warning:
    "border-amber-400/20 bg-amber-400/10 text-amber-100 shadow-[0_18px_30px_rgba(245,158,11,0.12)]",
  critical:
    "border-rose-400/20 bg-rose-400/10 text-rose-100 shadow-[0_18px_30px_rgba(244,63,94,0.12)]"
};

type MetricCardProps = {
  metric: DashboardMetric;
};

export function MetricCard({ metric }: MetricCardProps) {
  const Icon = iconMap[metric.icon] ?? Activity;

  return (
    <Card className={cn("overflow-hidden border", toneMap[metric.tone])}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardDescription className="text-xs uppercase tracking-[0.18em] text-current/70">
              {metric.label}
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {metric.value}
            </CardTitle>
          </div>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-black/20 text-current">
            <Icon className="h-5 w-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-current/80">{metric.helper}</p>
      </CardContent>
    </Card>
  );
}
