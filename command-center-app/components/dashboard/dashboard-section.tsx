import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardSectionProps = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
};

export function DashboardSection({
  title,
  description,
  action,
  className,
  contentClassName,
  children
}: DashboardSectionProps) {
  return (
    <Card className={cn("min-w-0 overflow-hidden border-border/80 bg-card/80", className)}>
      <CardHeader className="min-w-0 border-b border-border/60 pb-5">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="break-words text-lg">{title}</CardTitle>
            <CardDescription className="max-w-2xl break-words text-sm leading-6">
              {description}
            </CardDescription>
          </div>
          {action ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2 overflow-x-auto pb-1">
              {action}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className={cn("min-w-0 p-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
