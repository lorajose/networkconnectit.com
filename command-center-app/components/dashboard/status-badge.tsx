import { AlertTriangle, CheckCircle2, MinusCircle, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/dashboard/types";

const toneStyles: Record<
  StatusTone,
  { className: string; dotClassName: string; Icon: typeof CheckCircle2 }
> = {
  healthy: {
    className:
      "border-emerald-500/20 bg-emerald-500/12 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]",
    dotClassName: "bg-emerald-400",
    Icon: CheckCircle2
  },
  warning: {
    className:
      "border-amber-500/20 bg-amber-500/12 text-amber-200 shadow-[0_0_0_1px_rgba(245,158,11,0.08)]",
    dotClassName: "bg-amber-400",
    Icon: AlertTriangle
  },
  critical: {
    className:
      "border-rose-500/20 bg-rose-500/12 text-rose-200 shadow-[0_0_0_1px_rgba(244,63,94,0.08)]",
    dotClassName: "bg-rose-400",
    Icon: ShieldAlert
  },
  unknown: {
    className:
      "border-slate-500/20 bg-slate-500/12 text-slate-200 shadow-[0_0_0_1px_rgba(148,163,184,0.08)]",
    dotClassName: "bg-slate-400",
    Icon: MinusCircle
  },
  info: {
    className:
      "border-sky-500/20 bg-sky-500/12 text-sky-200 shadow-[0_0_0_1px_rgba(56,189,248,0.08)]",
    dotClassName: "bg-sky-400",
    Icon: AlertTriangle
  }
};

type StatusBadgeProps = {
  tone: StatusTone;
  label: string;
  withIcon?: boolean;
  className?: string;
};

export function StatusBadge({
  tone,
  label,
  withIcon = false,
  className
}: StatusBadgeProps) {
  const { className: toneClassName, dotClassName, Icon } = toneStyles[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium capitalize tracking-[0.02em]",
        toneClassName,
        className
      )}
    >
      {withIcon ? <Icon className="h-3.5 w-3.5" /> : <span className={cn("h-2 w-2 rounded-full", dotClassName)} />}
      {label}
    </span>
  );
}
