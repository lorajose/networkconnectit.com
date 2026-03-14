import { AlertTriangle, Info, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { RuntimeConfigWarning } from "@/lib/runtime-config";

type RuntimeConfigBannerProps = {
  warnings: RuntimeConfigWarning[];
};

const toneStyles = {
  critical: {
    icon: ShieldAlert,
    className:
      "border-rose-500/30 bg-rose-500/10 text-rose-100",
    badgeClassName:
      "border-rose-400/25 bg-rose-500/10 text-rose-100"
  },
  warning: {
    icon: AlertTriangle,
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-100",
    badgeClassName:
      "border-amber-400/25 bg-amber-500/10 text-amber-100"
  },
  info: {
    icon: Info,
    className:
      "border-sky-500/30 bg-sky-500/10 text-sky-100",
    badgeClassName:
      "border-sky-400/25 bg-sky-500/10 text-sky-100"
  }
} as const;

export function RuntimeConfigBanner({
  warnings
}: RuntimeConfigBannerProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/80 bg-card/70">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Runtime review</Badge>
          <Badge variant="outline">
            {warnings.length} environment warning
            {warnings.length === 1 ? "" : "s"}
          </Badge>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {warnings.map((warning) => {
            const Icon = toneStyles[warning.tone].icon;

            return (
              <div
                key={warning.id}
                className={`rounded-2xl border px-4 py-3 ${toneStyles[warning.tone].className}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{warning.title}</p>
                      <Badge
                        variant="outline"
                        className={toneStyles[warning.tone].badgeClassName}
                      >
                        {warning.tone}
                      </Badge>
                    </div>
                    <p className="text-sm leading-6 opacity-90">
                      {warning.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
